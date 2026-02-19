# WF3: Avi LPT — Daily Reminders

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Daily Reminders
**Trigger:** Schedule — 7:00 AM ET, Monday through Saturday
**Credential:** Lion Environmental Bot (Telegram), Avi's Google Sheets
**Existing baseline:** `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-daily-reminder.json` (~90% complete — has schedule trigger, reads jobs+workers, filters today's jobs, sends reminders + Avi summary)

---

## Trigger

Schedule node, cron expression: `0 7 * * 1-6`, timezone: `America/New_York`
(Fires at 7:00 AM ET on Monday through Saturday. No Sunday runs.)

---

## Logic

### Step 1: Read data

Read both sheets in parallel:
- Jobs sheet — all rows
- Workers sheet — all rows

### Step 2: Determine today's date

Get today's date in ET. Format it the same way dates are stored in column I (Scan Date) of the Jobs sheet — typically `YYYY-MM-DD` or `M/D/YYYY` depending on how Google Sheets formats it. Use a Code node to normalize both "today" and each job's scan date to the same format before comparing.

### Step 3: Filter jobs

Find all jobs where:
- Column I (Scan Date), when parsed as a date, equals today's date
- Column L (Dispatch Status) = `"Assigned"`

If no jobs match today: stop. Do nothing. Do not send any messages.

### Step 4: For each today's job — send worker reminder

For each matched job:
1. Get the assigned worker name from column K (Assigned Worker).
2. Look up that worker in the Workers sheet by column A (Name). Find their Telegram Chat ID from column H.
3. If no Chat ID found for this worker: skip sending to them (log a warning if possible, or just skip silently).
4. Read the service type from column R of the job row. Determine the quantity label: `"apartments"` for Dust Swab, `"units"` for LPT (or if col R is empty).
5. Send Telegram message to the worker's Chat ID (Markdown parse mode):
   ```
   🔨 *TODAY'S JOB* [serviceType from col R, e.g. "LPT" or "Dust Swab"]

   Job #[Job # from col A]
   📍 [address from col D]
   🏢 [units from col E] [quantityLabel]
   📝 [notes from col J, or "No special notes" if empty]
   ```
   Include inline keyboard:
   - Label: `"✅ MARK COMPLETE"`, callback_data: `"complete_[jobNumber]_[rowNumber]"`

   Where `rowNumber` is the row index of this job in the Jobs sheet (1-indexed, including header row, so data rows start at 2).

### Step 5: Send summary to Avi

After all worker messages are sent (or attempted), send a single summary message to Avi (chat ID 6431723336):
```
📋 Today's jobs ([count]):

• Job #[num]: [assignedWorker] at [address]
• Job #[num]: [assignedWorker] at [address]
...
```

Use plain text (no Markdown needed here), one bullet per job.

---

## Implementation Notes

- The "today's date" comparison is the most failure-prone part. Scan Date in the sheet may be stored as a formatted date string like `"2/20/2026"` or ISO `"2026-02-20"` depending on the cell format. Handle both by parsing with JavaScript `new Date()` and comparing year/month/day only (ignore time).
- Worker name matching: the Jobs sheet stores just the worker's first name in column K (per WF1 which sets it to `workerName` — their first name). The Workers sheet column A has full names. Match by checking if the worker's full name starts with or includes the first name from the Jobs sheet, or do a case-insensitive includes check.
- If the same worker is assigned to multiple jobs today, they'll receive multiple messages — one per job. This is intentional.
- Saturday is included because jobs can happen on Saturdays. Sunday is excluded.
- The existing baseline is ~90% complete — the main thing to verify/add is the inline keyboard button on the worker reminder message.
