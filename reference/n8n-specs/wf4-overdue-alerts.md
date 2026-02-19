# WF4: Avi LPT — Overdue Alerts

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Overdue Alerts
**Trigger:** Schedule — 8:00 AM ET, every day
**Credential:** Lion Environmental Bot (Telegram), Avi's Google Sheets
**Existing baseline:** None — build from scratch

This workflow runs two checks every morning:
1. **Every day:** Find prospects whose follow-up date is past due (overdue follow-ups)
2. **Mondays only:** Find invoices that have been unpaid for 7+ days (overdue invoices)

Both send a Telegram alert to Avi if anything is overdue.

---

## Trigger

Schedule node, cron expression: `0 8 * * *`, timezone: `America/New_York`
(Fires at 8:00 AM ET every day.)

---

## Part 1: Overdue Follow-ups (runs every day)

### Step 1: Read Prospects sheet

Read all rows from the Prospects sheet.

### Step 2: Filter overdue prospects

Find rows where ALL of the following are true:
- Column G (Next Follow-up) has a value (not empty)
- Column G parsed as a date is strictly before today (yesterday or earlier — not today)
- Column F (Status) is NOT `"Confirmed"` AND NOT `"Lost"`

The idea: if we haven't followed up and the prospect is still in-flight, flag it.

### Step 3: If any overdue, send Telegram to Avi

If the filtered list is empty: do nothing for this part (move on to Part 2).

If 1+ prospects are overdue, send a Telegram message to Avi (6431723336):
```
⏰ Overdue Follow-ups ([count])

• [company] - [contact name] - [phone]
• [company] - [contact name] - [phone]
...
```

Use plain text (no Markdown). One bullet per overdue prospect. If the list is long (more than ~15), truncate at 15 and add `"...and [N] more."` at the end. Telegram has a 4096 character message limit.

---

## Part 2: Overdue Invoices (Mondays only)

### Step 4: Check if today is Monday

Get today's day of week in ET. If it is NOT Monday: skip the rest of this workflow (stop).

If it IS Monday: continue.

### Step 5: Read Invoices sheet

Read all rows from the Invoices sheet.

### Step 6: Filter overdue invoices

Find rows where ALL of the following are true:
- Column H (Status) = `"Pending"` (has been sent but not paid)
- Column F (Date Sent) has a value (not empty) and can be parsed as a date
- The number of days between Date Sent and today is >= 7

For each matching invoice, compute `daysOverdue = Math.floor((today - dateSent) / (1000 * 60 * 60 * 24))`.

### Step 7: If any overdue, send Telegram to Avi

If the filtered list is empty: stop.

If 1+ invoices are overdue, send a Telegram message to Avi (6431723336):
```
💸 Overdue Invoices ([count])

• Invoice #[invoiceNum] - [client] - $[amount] - [daysOverdue] days
• Invoice #[invoiceNum] - [client] - $[amount] - [daysOverdue] days
...
```

Use plain text. If amount is a number, format to 2 decimal places.

---

## Implementation Notes

- Date comparisons: parse dates with `new Date()` and compare at the date level (zero out hours/minutes/seconds in ET before comparing). Google Sheets date strings may be `"M/D/YYYY"` or `"YYYY-MM-DD"` — handle both.
- "Strictly before today" for follow-ups: a follow-up date equal to today is NOT overdue — only dates before today.
- "7+ days" for invoices: count the calendar days from Date Sent to today. If Date Sent was last Monday (7 days ago), it IS overdue.
- Monday check: JavaScript `Date.getDay()` returns 1 for Monday. Be sure to get the current day in ET, not UTC.
- The two parts (follow-ups, invoices) can be connected sequentially or run as parallel branches — either is fine. Sequential is simpler.
- Both Telegram messages are separate sends — don't combine them into one message. Avi can see them as two distinct alerts.
- If Avi's Telegram ID changes later, it's stored in the shared config. Use the value `6431723336` for now.
