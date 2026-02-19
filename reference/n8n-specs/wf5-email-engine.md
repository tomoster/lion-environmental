# WF5: Avi LPT — Cold Email Engine

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Cold Email Engine
**Trigger:** Schedule — every 15 minutes
**Credentials:** Avi's Google Sheets, Avi's Gmail
**Existing baseline:** None — build from scratch

This workflow processes the cold email queue. It reads the Prospects sheet, finds prospects who are due for their next email, sends emails via Gmail, and updates the sheet with the next send time. It enforces a daily send limit, business hours window, and checks the suppression list before each send.

This replaces the `processEmailQueue` function that existed in the Apps Script.

---

## Trigger

Schedule node, cron expression: `*/15 * * * *`, timezone: `America/New_York`
(Fires every 15 minutes, all day, every day. The business hours check is done inside the workflow.)

---

## Step 1: Business Hours Check

Read the current time in ET (`America/New_York`).

Only proceed if:
- Day of week is Monday through Friday (getDay() returns 1-5)
- Hour (in ET) is >= 9 (9:00 AM or later)
- Hour (in ET) is < 17 (before 5:00 PM — i.e., last valid send is at 4:59 PM)

If outside business hours: stop the workflow. Do nothing.

---

## Step 2: Read Email Templates Config

Read the Email Templates sheet. It has two columns: A = setting name, B = value. Build a config object by iterating all rows and creating a key-value map.

Keys to extract:
- `Daily Send Limit` — parse as integer (default 10 if missing)
- `Subject Line` — string template
- `Email 1`, `Email 2`, `Email 3`, `Email 4` — string templates (body)
- `Step 1→2 Delay (days)`, `Step 2→3 Delay (days)`, `Step 3→4 Delay (days)` — parse as integers (default 3 if missing)
- `Sender Name` — string (default "Avi Bursztyn")
- `Unsubscribe Footer` — string

---

## Step 3: Check Daily Limit

Read the Email Log sheet (all rows).

Count rows where:
- Column A (Timestamp) is a datetime from today (same calendar date in ET)
- Column G (Status) = `"sent"`

If `sentToday >= Daily Send Limit`: stop. Do nothing.

Store `sentToday` count — you'll need it to stop mid-loop if the limit is hit.

---

## Step 4: Read Supporting Data

Read two sheets in parallel:
- Prospects sheet — all rows
- Suppression List sheet — all rows

Build a Set of suppressed emails from column A of the Suppression List for fast lookups.

---

## Step 5: Process Each Prospect

Iterate over Prospects sheet rows (skip header row 1). For each row:

**Early exit check:** If `sentToday >= Daily Send Limit`, stop processing further rows.

**Skip conditions (skip to next row if any are true):**
- Column J (Seq Status) is NOT `"active"`
- Column D (Email) is empty
- Column L (Next Send) is empty
- Column L (Next Send) parsed as a datetime is in the future (later than now)

**Suppression check:**
- Look up column D (Email) in the suppression Set.
- If found: update Prospects sheet — set column J to `"unsubscribed"`. Skip to next row.

**Get template:**
- Read column K (Seq Step) as an integer. This is the step number for the email to send NOW.
- Look up `"Email [step]"` in the config object.
- If no template for this step (step > 4 or template is empty): update Prospects sheet — set column J to `"completed"`. Skip.

**Personalize:**
- `{{first_name}}` → first word of column B (Contact Name). If Contact Name is empty, use `"there"`.
- `{{company}}` → column A (Company).
- Apply these replacements to both the subject line template and the body template.

**Build final body:**
- Append the unsubscribe footer: `[body]\n\n---\n[Unsubscribe Footer]`

**Send email via Gmail:**
- To: column D (Email)
- Subject: personalized subject line
- Body: personalized body with footer (plain text — not HTML unless templates contain HTML)
- From name: Sender Name from config (this may need to be set in Gmail node's "From Name" field)
- Reply-to: `lionenvironmentalllc@gmail.com`

**On send success:**
- Append row to Email Log sheet:
  `[now, rowNumber, company, email, step, subject, "sent", ""]`
  (rowNumber = the 1-based row index of this prospect in the Prospects sheet, including header, so data rows start at 2)
- Increment `sentToday` counter.
- **Advance the sequence:**
  - If `step >= 4`:
    - Update Prospects: column J = `"completed"`, column K = 4, column L = `""` (clear Next Send)
  - Else (step 1, 2, or 3):
    - Look up delay from config: `"Step [step]→[step+1] Delay (days)"` (default 3 if missing)
    - Calculate next send datetime:
      1. Start with now + delay days (in milliseconds)
      2. Set time to 9:00 AM ET + random 0-60 minutes (use `Math.random() * 60` minutes)
      3. If the resulting day is Saturday (getDay() === 6): add 2 more days to land on Monday
      4. If the resulting day is Sunday (getDay() === 0): add 1 more day to land on Monday
    - Update Prospects: column K = step + 1, column L = calculated next send datetime (formatted as ISO string or the same format already used in column L)

**On send failure:**
- Append row to Email Log: `[now, rowNumber, company, email, step, subject, "failed", errorMessage]`
- Check if the error message contains `"Invalid"` or `"doesn't exist"` or similar bounce indicators:
  - If yes: update Prospects — column J = `"bounced"`. Append to Suppression List sheet: `[email, "bounce", now]`
- Do NOT increment `sentToday` on failure.
- Continue processing the next prospect (don't stop the whole workflow on one failure).

---

## Implementation Notes

- **Row number tracking:** When reading the Prospects sheet, track the row index so you can write back to specific rows. Google Sheets rows are 1-based; the header is row 1, so data rows start at 2. When writing back, use "Update Row" with the row number.
- **The loop:** n8n doesn't have a native while-loop. Use a Split In Batches node (batch size 1) to process one prospect at a time, with a stop condition checked via a Code node at the start of each batch. Alternatively, process all prospects in a Code node loop and collect updates, then batch-write.
- **Sheet write strategy:** Writing to the sheet one row at a time inside a loop creates many API calls. Consider collecting all updates during the loop and doing batch writes at the end. However, the Email Log must be appended after each send to keep the daily count accurate if the workflow is interrupted.
- **Next Send date format:** Read how column L currently stores dates (check existing rows). Match that format when writing back. ISO 8601 (`"2026-02-23T09:15:00"`) is safe.
- **Sender Name in Gmail:** The Gmail node in n8n may have a "Sender Name" or "From Name" field. Set it to the value from config. If not available, the email will go out from the Gmail address directly.
- **Plain text vs HTML:** The email body is plain text unless the template strings contain HTML tags. Treat as plain text by default and use the Gmail node's plain text body field.
