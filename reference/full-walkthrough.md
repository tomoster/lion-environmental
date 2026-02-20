# Full E2E Walkthrough

Master checklist for testing the entire system end-to-end, following the real business flow. This is the source of truth for the current testing session.

**How to use:** Start at the first unchecked step. The agent reads this doc at session start, walks you through the current step, and marks it done when you say "next".

---

## Step 1: Worker Onboarding

**Status:** [x] DONE

**What to do:**
- Open Telegram, message the bot with `/start`
- Bot asks for your name — type the worker's name
- Bot fuzzy-matches against worker profiles in the database

**What to verify:**
- Bot responds asking for name after `/start`
- Name matched to correct worker profile
- `telegram_chat_id` saved on the worker record in Supabase
- `/start` with already-registered worker responds with "already registered"

**Issues found:**
_None_

---

## Step 2: Add Prospect

**Status:** [x] DONE

**What to do:**
- Navigate to Prospects page
- Click "Add Prospect"
- Fill all fields: company, contact name, phone, email, building address, service interest
- Save

**What to verify:**
- Prospect appears in the table with correct data
- Can edit a prospect's details and save
- Can change prospect status (New -> Called -> Qualified, etc.)
- Can delete a prospect

**Issues found:**
_None_

---

## Step 3: Prospect to Job

**Status:** [x] DONE

**What to do:**
- From a prospect row, click "Create Job"
- Observe the new job form

**What to verify:**
- Company, email, and building address carry over from prospect
- `prospect_id` is linked on the created job

**Issues found:**
_None_

---

## Step 4: Job Creation

**Status:** [x] DONE

**What to do:**
- Create a new job from the Jobs page
- Select service type: LPT — fill units, price/unit, common spaces, price/common space
- Select service type: Dust Swab — fill number of wipes
- Select service type: Both — verify both field sets appear
- Set scan date and start time
- Assign a worker from the dropdown
- Save

**What to verify:**
- Estimated end time auto-calculates based on units/service type
- Changing service type or units recalculates end time
- Worker dropdown shows active workers only
- Save redirects to job detail page

**Issues found:**
_None_

---

## Step 5: Job Detail Page

**Status:** [x] DONE

**What to do:**
- Open the job detail page for the job created in Step 4
- Test editing each field group:
  - Company, email, address, notes
  - Start time (verify end time recalculates on save)
  - Service type (verify pricing sidebar updates)
  - Assigned worker

**What to verify:**
- All fields display the saved values correctly
- Estimated end time is read-only
- Pricing sidebar shows correct line items:
  - **LPT:** units x price/unit + common spaces x price/common space
  - **Dust Swab:** site visit ($375) + report ($135) + wipes (qty x $20)
  - **Both:** all line items combined
- Tax calculation at 8.88%
- Job Info sidebar shows correct service type, date, time range, worker
- Changes persist after save

**Issues found:**
- Save button had no loading state or confirmation toast — user couldn't tell if save worked. Fixed: added SaveForm client component with useTransition + sonner toast.

---

## Step 6: Dispatch

**Status:** [x] DONE

> **Note:** There's auto-dispatch on first save behavior. In `src/app/(dashboard)/jobs/actions.ts:112-114`, any time a job is saved while its status is "not_dispatched", `broadcastJobToWorkers()` fires automatically. If you already edited and saved the job in Step 5, dispatch may have already triggered. Check the job's job_status before manually dispatching.

**What to do:**
- Check the job's current job_status
- If still "not_dispatched": click "Dispatch to Workers" from job detail
- If already "open" from auto-dispatch: skip the button click, just verify the Telegram message

**What to verify:**
- Dispatch status changes from "not_dispatched" to "open"
- All active workers with Telegram chat IDs receive the dispatch message
- Message includes: job number, client, address, date, time, units, service type, notes
- Message has "Accept" inline button
- Dispatch button disappears from UI after dispatching
- Workers without Telegram chat ID are skipped without error

**Issues found:**
- Auto-dispatch confirmed working: saving a job with status "not_dispatched" triggers broadcastJobToWorkers automatically, changing status to "open". Telegram messages received by workers.

---

## Step 7: Worker Accepts Job

**Status:** [x] DONE

**What to do:**
- In Telegram, tap "Accept" on the dispatched job message
- Try accepting from a second worker after the first has accepted

**What to verify:**
- Job assigned to the accepting worker
- Job job_status changes to "assigned"
- Assigned worker field updates on the job detail page
- Second worker trying to accept gets an error message
- Management notified of acceptance (if applicable)

**Issues found:**
- Accept silently failed when multiple workers shared the same telegram_chat_id (.single() errored on 3 rows). Fixed: use .maybeSingle() with role filter.
- Dispatch message missing common spaces and wipes counts. Fixed: added to broadcast query and message text.
- No worker specialty filtering — all workers got all dispatches. Fixed: added has_xrf/has_dust_swab/has_asbestos columns + UI + dispatch filtering.
- User requested dispatch messages be deleted from all workers' chats on accept. Fixed: broadcast saves message IDs, accept handler deletes them all.

---

## Step 8: Worker Completes Job

**Status:** [x] DONE

**What to do:**
- Worker taps "Mark Complete" button (shown on accept confirmation or daily reminder)
- Verify from both Telegram and UI

**What to verify:**
- Job job_status changes to "completed"
- Job report_status changes to "field_work_done"
- Worker gets confirmation message: "Job #X marked as completed. Please send the report document when ready."
- Invoice auto-generated with correct line items and amounts
- Invoice PDF auto-generated and stored in Supabase Storage
- Avi gets Telegram message with worker name, job details, invoice summary, and "Approve & Send Invoice" button
- "Mark Complete" button appears on accept confirmation (not just daily reminder)
- Job detail page reflects the completion

**Issues found:**
- "Approve & Send Invoice" button failed due to missing Resend API key — key added, but domain verification pending (Register.com DNS records needed). Will retest in Step 11.
- Added office worker notification on job completion (Nazish gets "Please coordinate with them about the report" message). All three notifications confirmed working.


---

## Step 9: Report Upload

**Status:** [x] DONE

**What to do:**
- Upload a PDF via Telegram — bot asks which job it belongs to
- Select the job
- Also test uploading from the UI (job detail page)

**What to verify:**
- File stored in Supabase Storage
- Report linked to the correct job
- Report file path appears on job detail page
- Upload with no assigned jobs shows appropriate error
- Can upload a replacement report (path updates)
- Report is NOT sent to client at this point (just stored)

**Issues found:**
- Telegram upload query missed dust swab intermediate statuses (sent_to_lab, results_received). Fixed: widened filter.
- After "Client Paid" triggered autoSendReports prematurely (sent 1/3 XRF, 1/2 dust swab), statuses became "sent" and upload query returned nothing. Fixed: reset test data + query fix.

---

## Step 10: Invoice Auto-Generated on Completion

**Status:** [x] DONE

**What to do:**
- Verify the invoice that was auto-generated when the worker marked complete (Step 8)
- Navigate to the invoice from the Invoices page

**What to verify:**
- Company, address, and line items pre-fill correctly from the job
- **LPT line items:** units x price/unit + common spaces x price/common space
- **Dust Swab line items:** site visit ($375) + report ($135) + wipes (qty x $20)
- Subtotal, tax (8.88%), and total calculations correct
- Invoice status is "draft"
- Invoice PDF exists in Supabase Storage
- Invoice linked to the job

**Issues found:**


---

## Step 11: Send Invoice

**Status:** [x] DONE — sent via Telegram "Approve & Send Invoice" button. Gmail SMTP working. Added duplicate send guard. PDF fits on one page.

**What to do:**
- Avi taps "Approve & Send Invoice" button in Telegram
- Also test from the UI: navigate to invoice, click "Send Invoice to Client"

**What to verify:**
- Email arrives at client with PDF attachment
- Invoice status changes to "sent"
- Telegram callback produces same result as UI

**Issues found:**


---

## Step 12: Mark as Paid

**Status:** [x] DONE

**What to do:**
- On the invoice, click "Mark as Paid"

**What to verify:**
- Invoice status changes to "paid"
- `date_paid` field is set to today
- Invoice appears correctly in the Invoices table with paid status

**Issues found:**


---

## Step 13: Send Report (After Payment)

**Status:** [x] DONE

**What to do:**
- Try sending report BEFORE marking invoice as paid — should be blocked
- Mark invoice as paid (Step 12), then send the report
- Test via both UI ("Send Report to Client" button) and Telegram

**What to verify:**
- "Send Report to Client" button only appears when invoice is paid
- Telegram send report blocked with "Invoice hasn't been paid yet" message if not paid
- After payment: email arrives at client with report PDF attached
- Email includes job number, service type, property address
- Job report_status updates to "report_sent" after sending

**Issues found:**


---

## Step 14: Daily Reminders

**Status:** [ ] NOT STARTED

**What to do:**
- Create a job scheduled for today with an assigned worker
- Hit the cron endpoint: `GET /api/cron/daily-reminders` with Bearer token
- Create a job for tomorrow to test heads-up messages

**What to verify:**
- Endpoint returns 200 with valid token, 401 without
- Assigned worker receives Telegram reminder with "Complete" button
- Tomorrow's jobs: workers get heads-up (no "Complete" button)
- Management receives summary with today's and tomorrow's job count + details
- No jobs scheduled: management gets "no jobs" summary
- Workers without Telegram chat ID skipped without error

**Issues found:**


---

## Step 15: Overdue Alerts

**Status:** [ ] NOT STARTED

**What to do:**
- Create a prospect with `next_followup` date in the past
- Create an invoice with status "sent" and `due_date` in the past
- Hit the cron endpoint: `GET /api/cron/overdue-alerts` with Bearer token
- Test on both a Monday and a non-Monday

**What to verify:**
- Endpoint returns 200 with valid token
- Overdue prospect follow-ups: management alerted
- No overdue prospects: no prospect alert
- **On Monday:** overdue invoices alert + unsent draft invoice count
- **Tuesday-Sunday:** invoice alerts NOT sent
- No overdue items: no messages sent

**Issues found:**


---

## Step 16: Settings

**Status:** [ ] NOT STARTED

**What to do:**
- Navigate to Settings page
- Change LPT default price per unit
- Change LPT default price per common space
- Change duration settings (per unit, per common space, dust swab)
- Create a new job to verify defaults apply

**What to verify:**
- New jobs pre-fill with updated default prices
- New jobs calculate end times using updated durations
- Editing an existing job's start time uses new durations for end time calc

**Issues found:**


---

## Step 17: Worker Availability

**Status:** [ ] NOT STARTED

**What to do:**
- Create two jobs on the same date with overlapping times
- Assign worker A to job 1
- Check job 2's worker dropdown
- Test recurring day off (e.g., Sundays) and one-off day off

**What to verify:**
- Worker A shows unavailable in job 2 dropdown with conflict reason
- Changing job 1's time to not overlap makes worker A available on job 2
- Deleting job 1 makes worker A available on job 2
- Recurring day off: worker unavailable for all jobs on that weekday
- One-off day off: worker unavailable for that specific date only
- Adding/removing availability blocks persists on reload

**Issues found:**


---

## Summary

| # | Step | Status |
|---|------|--------|
| 1 | Worker Onboarding | [x] DONE |
| 2 | Add Prospect | [x] DONE |
| 3 | Prospect to Job | [x] DONE |
| 4 | Job Creation | [x] DONE |
| 5 | Job Detail Page | [x] DONE |
| 6 | Dispatch | [x] DONE |
| 7 | Worker Accepts Job | [x] DONE |
| 8 | Worker Completes Job | [x] DONE |
| 9 | Report Upload | [x] DONE |
| 10 | Invoice Auto-Generated on Completion | [x] DONE |
| 11 | Send Invoice | [x] DONE |
| 12 | Mark as Paid | [x] DONE |
| 13 | Send Report (After Payment) | [x] DONE |
| 14 | Daily Reminders | [ ] SKIPPED (trusted) |
| 15 | Overdue Alerts | [ ] SKIPPED (trusted) |
| 16 | Settings | [ ] NOT STARTED |
| 17 | Worker Availability | [ ] NEXT |
