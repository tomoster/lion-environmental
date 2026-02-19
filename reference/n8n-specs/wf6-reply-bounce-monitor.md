# WF6: Avi LPT — Reply & Bounce Monitor

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Reply & Bounce Monitor
**Trigger:** Schedule — every 30 minutes
**Credentials:** Avi's Google Sheets, Avi's Gmail, Lion Environmental Bot, OpenRouter API
**Existing baseline:** None — build from scratch

This workflow monitors the Gmail inbox for two things:
1. **Replies** to cold emails — classify them and update prospect status accordingly
2. **Bounces** — mailer-daemon notifications that indicate a bad email address

It also sends a daily summary to Avi at ~5:30 PM ET.

---

## Trigger

Schedule node, cron expression: `*/30 * * * *`, timezone: `America/New_York`
(Fires every 30 minutes, all day.)

---

## Part 1: Reply Detection

### Step 1.1: Get base subject from Email Templates

Read the Email Templates sheet, get the `Subject Line` setting (the template string, e.g., `"Quick question about {{company}}"`).

Strip template variables: remove all `{{...}}` patterns from the subject string. Also trim any trailing/leading spaces and punctuation that might be left. The result is a "base subject" used to search Gmail (e.g., `"Quick question about"`).

### Step 1.2: Search Gmail inbox for replies

Search Gmail with this query:
```
is:inbox subject:("[base subject]") newer_than:1d
```

Use the Gmail node with "Avi's Gmail" credential, list messages action. The `newer_than:1d` limits to the past 24 hours to avoid reprocessing old replies across executions.

Get up to 50 results (the search should return threads or messages).

### Step 1.3: Read Prospects sheet

Read all rows from the Prospects sheet. Build an index of email → row data for fast lookups.

### Step 1.4: Process each reply

For each Gmail message/thread returned:

**a. Get the sender email address.**
- Skip if sender matches `lionenvironmentalllc@gmail.com` (that's our own email).
- Skip if sender matches common no-reply addresses (noreply@, no-reply@, etc.).

**b. Look up sender in Prospects.**
- Find a prospect row where column D (Email) matches the sender email AND column J (Seq Status) = `"active"`.
- If no match: skip this message (unrelated email).

**c. Get the reply body** (plain text preferred over HTML).

**d. Strip quoted text.** Remove everything that is:
- After a line matching `"On .* wrote:"` (Gmail quote header)
- After a line containing `"From:"` followed by `"Sent:"` on the next line (Outlook quote)
- Lines beginning with `">"` (standard email quoting)
- After a line of only `"---"` or `"___"` (dividers)

After stripping, trim whitespace. If the remaining text is empty or fewer than 5 characters: skip (it was probably just a quoted reply with no new content).

**e. Classify the reply using OpenRouter LLM.**

HTTP POST to `https://openrouter.ai/api/v1/chat/completions` with the "OpenRouter API" credential:
- Model: `anthropic/claude-3.5-haiku`
- Max tokens: 20
- System message:
  ```
  You classify email replies into exactly one category. Respond with ONLY the category name, nothing else.

  Categories:
  - interested: The person wants to learn more, schedule a call, get a quote, or is open to talking
  - not_interested: The person declines, says no thanks, not right now, already has a vendor, etc.
  - unsubscribe: The person explicitly asks to stop receiving emails, be removed, or opts out
  - out_of_office: An auto-reply about being away, on vacation, or unavailable
  - other: Anything that doesn't clearly fit the above
  ```
- User message:
  ```
  Classify this email reply:

  [first 1000 characters of the stripped body]
  ```

Parse the response. Trim whitespace and lowercase. The result should be one of: `interested`, `not_interested`, `unsubscribe`, `out_of_office`, `other`.

**f. Act on classification:**

- `"unsubscribe"`:
  - Update Prospects: column J = `"unsubscribed"`, clear column L (Next Send)
  - Append to Suppression List: `[email, "unsubscribe", now]`

- `"out_of_office"`:
  - Do nothing. Don't update the prospect. They'll get the next email when Next Send is reached.

- `"interested"`, `"not_interested"`, `"other"`:
  - Update Prospects: column J = `"replied"`, clear column L (Next Send)
  - If `"interested"`:
    - Send Telegram to Avi (6431723336) with Markdown parse mode:
      ```
      🔥 *HOT LEAD!*

      *[company]* replied to your email!
      📧 [email]

      '[first 150 chars of stripped reply body]...'

      Follow up with a call NOW!
      ```
  - If `"not_interested"`:
    - Send Telegram to Avi:
      ```
      📧 *[company]* responded (not interested).
      📧 [email]

      '[first 100 chars of stripped body]...'

      Check email for details.
      ```

---

## Part 2: Bounce Detection

### Step 2.1: Search Gmail for bounce notifications

Search Gmail with:
```
from:(mailer-daemon OR postmaster) newer_than:1d
```

Get up to 50 results.

### Step 2.2: Process each bounce notification

For each bounce message:

**a. Get the full body** (plain text).

**b. Call OpenRouter LLM to extract the bounced email and classify:**

HTTP POST to OpenRouter:
- Model: `anthropic/claude-3.5-haiku`
- Max tokens: 80
- System message:
  ```
  Extract the recipient email address that bounced from this bounce notification. Also classify the bounce type: hard_bounce (bad address, doesn't exist, no such user, unknown recipient) or soft_bounce (mailbox full, temporary failure, server busy, try again later). Return ONLY valid JSON with no other text: {"email": "user@example.com", "type": "hard_bounce"}
  ```
- User message: first 1500 characters of the bounce body

**c. Parse the LLM JSON response.**
- If JSON parsing fails (LLM returned malformed JSON):
  - Fallback: use a regex to find all email addresses in the bounce body (`/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi`)
  - Filter out: `mailer-daemon@*`, `postmaster@*`, `lionenvironmentalllc@gmail.com`, and any addresses from our own domain
  - Take the first remaining address as the bounced email
  - Default type to `"hard_bounce"` if unknown

**d. Look up the bounced email in Prospects:**
- Find row where column D (Email) matches AND column J (Seq Status) = `"active"`
- If not found: skip (bounce for an email not in our active sequence)

**e. Update Prospects:**
- Set column J = `"bounced"`
- Clear column L (Next Send)

**f. If type is `"hard_bounce"`:**
- Append to Suppression List: `[email, "hard_bounce", now]`
(Soft bounces are not permanently suppressed — they might work later.)

**g. Track bounce count:** increment a `bounceCount` variable.

### Step 2.3: High bounce rate alert

After processing all bounces:
- Read Email Log, count rows from today with status = `"sent"` → `sentToday`
- If `bounceCount > 0`:
  - Calculate bounce rate: `bounceCount / sentToday`
  - If bounce rate > 0.05 (5%) AND sentToday > 0:
    - Send Telegram to Avi (6431723336):
      ```
      ⚠️ High Bounce Rate Alert

      [bounceCount] bounces out of [sentToday] sends today ([percent]%).
      Check your prospect list for bad email addresses.
      ```

---

## Part 3: Daily Summary

### Step 3.1: Check if it's ~5:30 PM ET

Get current time in ET. Only proceed with this part if:
- Hour = 17 (5:xx PM ET)
- Minute >= 25 AND minute <= 35

This approximates "between 5:25 PM and 5:35 PM" — the 30-minute schedule will hit this window roughly once a day.

If outside this window: skip (don't send the summary).

### Step 3.2: Gather today's stats

Read two sheets in parallel:
- Email Log — count rows from today: `sent` (status = "sent"), `bounced` (status = "bounced"), `failed` (status = "failed")
- Prospects — count rows where column J = "active" → `activeCount`

### Step 3.3: Send summary to Avi

Send Telegram to Avi (6431723336) with Markdown parse mode:
```
📊 *Daily Email Summary*

📤 Sent: [sent]
❌ Bounced: [bounced]
[line only if failed > 0: ⚠️ Failed: [failed]]
📬 Active sequences: [activeCount]
```

---

## Implementation Notes

- **Gmail search returns threads or messages:** Depending on the n8n Gmail node configuration, it may return threads (multiple messages per thread). To avoid classifying the same reply twice across 30-min runs, check if the message has already been processed. The simplest approach: search `newer_than:1d` (last 24h) every run — accept that within a day there may be duplicate sends to Avi for the same reply. Alternatively, mark messages as read or add a label after processing so they drop out of the search.
- **Duplicate processing guard:** A cleaner approach is to add a Gmail label "n8n-processed" after handling each reply/bounce, and add `-label:n8n-processed` to the search query. This requires creating the label in Gmail first.
- **Sheet write batching:** Since parts 1 and 2 may update many rows in the Prospects sheet, consider collecting all updates (rowNumber → changes) and doing a single batch update at the end rather than one API call per row.
- **Suppression list writes:** Similarly, collect all suppression additions and append in a batch at the end.
- **OpenRouter errors:** If the LLM call fails (timeout, rate limit, etc.), default to classification `"other"` for replies and skip the bounce for now — don't error out the whole workflow.
- **"Interested" reply truncation:** When showing the reply snippet to Avi, strip the quote markers from the display too so it doesn't look cluttered.
- **Part 3 timing:** The 5:30 PM check is approximate. If the workflow happens to fire at 5:00 and 5:30, only the 5:30 run should send the summary. The `minute >= 25` check handles this. If the cron fires at 5:29 ET, it falls just inside the window — that's fine.
