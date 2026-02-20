# Workflow Tracker

Backend workflow testing checklist. Covers Telegram bot, cron jobs, dispatch, email sending, and scheduling logic. For UI/page testing, see `e2e-test-checklist.md`.

---

## 1. Telegram Bot

**Status:** Built

**Files:**
- `src/app/api/telegram/webhook/route.ts` — Webhook entry point, routes updates to handlers
- `src/lib/telegram/handlers/start.ts` — /start registration flow
- `src/lib/telegram/handlers/text-message.ts` — Name input + job number selection
- `src/lib/telegram/handlers/accept-job.ts` — Worker accepts dispatched job
- `src/lib/telegram/handlers/complete-job.ts` — Worker marks job complete
- `src/lib/telegram/handlers/document-upload.ts` — Report file upload
- `src/lib/telegram/handlers/report-for-job.ts` — Select which job a report belongs to
- `src/lib/telegram/handlers/send-invoice.ts` — Trigger invoice send from Telegram
- `src/lib/telegram/handlers/send-report.ts` — Trigger report send from Telegram
- `src/lib/telegram/client.ts` — API wrapper (sendMessage, getFileUrl, etc.)
- `src/lib/telegram/keyboard.ts` — Inline keyboard generation
- `src/lib/telegram/state.ts` — Conversation state tracking
- `src/lib/telegram/get-management-chat-ids.ts` — Fetch management Telegram chat IDs

### Testing checklist

- [x] /start with unregistered number -> bot asks for name
- [x] Type name -> bot matches to worker profile -> saves chat ID
- [ ] /start with already-registered worker -> bot responds with "already registered"
- [ ] Receive dispatched job message -> tap "Accept" -> job assigned to worker
- [ ] Accept job that another worker already accepted -> error message
- [ ] Receive today's job reminder -> tap "Complete" -> job marked complete
- [ ] Upload a PDF document -> bot asks which job it belongs to
- [ ] Select job for uploaded report -> report saved to Supabase Storage, linked to job
- [ ] Upload report when worker has no assigned jobs -> appropriate error
- [ ] Management receives "Send Invoice" button after job complete -> tap -> invoice emailed
- [ ] Management receives "Send Report" button -> tap -> report emailed
- [ ] Invalid/malformed webhook payload -> returns 200 without crashing

---

## 2. Job Dispatch

**Status:** Built

**Files:**
- `src/lib/telegram/broadcast.ts` — Broadcasts new job to all active field workers
- `src/app/api/jobs/[id]/dispatch/route.ts` — POST endpoint for dispatch
- `src/app/(dashboard)/jobs/[id]/automation-actions.ts` — Server action (dispatchJob)

### Testing checklist

- [ ] Dispatch a job from the UI -> all active workers with Telegram chat IDs receive the message
- [ ] Dispatch message includes: job number, client, address, date, time, units, service type, notes
- [ ] Dispatch message has "Accept" inline button
- [ ] Job dispatch_status changes from "not_dispatched" to "open"
- [ ] Dispatch button disappears from UI after dispatching
- [ ] Auto-dispatch on first save (new job) -> job broadcasts immediately
- [ ] Worker without Telegram chat ID -> skipped without error

---

## 3. Daily Reminders

**Status:** Built

**Files:**
- `src/app/api/cron/daily-reminders/route.ts` — Cron endpoint (GET with Bearer token)

### Testing checklist

- [ ] Hit endpoint with valid Bearer token -> 200 response
- [ ] Hit endpoint without token -> 401 response
- [ ] Jobs scheduled for today -> each assigned worker gets a Telegram reminder
- [ ] Today's reminder includes "Complete" button
- [ ] Jobs scheduled for tomorrow -> workers get a heads-up (no "Complete" button)
- [ ] Management receives summary: count of today's and tomorrow's jobs with details
- [ ] No jobs today or tomorrow -> management gets "no jobs" summary
- [ ] Worker with no Telegram chat ID -> skipped without error

---

## 4. Overdue Alerts

**Status:** Built

**Files:**
- `src/app/api/cron/overdue-alerts/route.ts` — Cron endpoint (GET with Bearer token)

### Testing checklist

- [ ] Hit endpoint with valid Bearer token -> 200 response
- [ ] Prospect with next_followup in the past -> management alerted
- [ ] No overdue prospects -> no prospect alert sent
- [ ] On a Monday: invoices with status "sent" past due_date -> management alerted
- [ ] On a Monday: draft invoices that haven't been sent -> management alerted with count
- [ ] On Tuesday-Sunday: invoice alerts are NOT sent
- [ ] No overdue items at all -> no messages sent

---

## 5. Invoice Sending

**Status:** Built

**Files:**
- `src/lib/email/send-invoice.ts` — Email via Resend + PDF attachment + storage upload
- `src/lib/pdf/invoice-template.tsx` — Invoice PDF React template
- `src/app/(dashboard)/invoices/actions.ts` — Server actions (generateInvoice, sendInvoiceToClient, markAsPaid, etc.)
- `src/lib/telegram/handlers/send-invoice.ts` — Telegram callback handler

### Testing checklist

- [ ] Generate invoice from job detail -> invoice record created with correct line items
- [ ] LPT invoice: units x price/unit + common spaces x price/common space
- [ ] Dust Swab invoice: site visit ($375) + report ($135) + wipes (qty x $20)
- [ ] Tax calculated at 8.88%
- [ ] Generate PDF -> downloads correctly with all fields populated
- [ ] Send invoice to client -> email arrives with PDF attachment
- [ ] Invoice status updates to "sent" after sending
- [ ] PDF uploaded to Supabase Storage
- [ ] Mark as paid -> status updates, date_paid set
- [ ] Send invoice via Telegram callback -> same result as UI send

---

## 6. Report Sending

**Status:** Built

**Files:**
- `src/lib/email/send-report.ts` — Email via Resend with PDF attachment
- `src/app/api/jobs/[id]/send-report/route.ts` — POST endpoint
- `src/lib/telegram/handlers/send-report.ts` — Telegram callback handler
- `src/app/(dashboard)/jobs/[id]/automation-actions.ts` — Server action (sendReport)

### Testing checklist

- [ ] Upload report to job (PDF) -> file stored in Supabase Storage
- [ ] Send report from UI -> email arrives to client with report attached
- [ ] Email includes job number, service type, property address
- [ ] Job report_status updates after sending
- [ ] Send report via Telegram callback -> same result as UI send
- [ ] Send report with no file uploaded -> appropriate error

---

## 7. Worker Scheduling

**Status:** Built

**Files:**
- `src/lib/scheduling.ts` — getAvailableWorkers(), conflict detection
- `src/lib/scheduling-utils.ts` — Time helpers, calculateEndTime()
- `src/app/(dashboard)/team/[id]/availability-section.tsx` — UI for managing days off

### Testing checklist

- [ ] Worker with recurring day off (e.g. Sundays) -> shows unavailable for jobs on Sundays
- [ ] Worker with one-off day off -> shows unavailable for that specific date only
- [ ] Worker assigned to job 9am-12pm -> shows unavailable for overlapping job on same date
- [ ] Worker assigned to job 9am-12pm -> shows available for non-overlapping job (e.g. 1pm-3pm)
- [ ] Auto-calculated end time: LPT job updates based on units + common spaces
- [ ] Auto-calculated end time: Dust Swab job uses fixed duration
- [ ] Add recurring day off in UI -> persists on reload
- [ ] Add one-off day off in UI -> persists on reload
- [ ] Remove availability block -> worker becomes available again

---

## 8. Cold Email Engine

**Status:** Not built

Was n8n WF5 in v1. 4-step email sequence with configurable delays, send window (9am-5pm ET Mon-Fri), daily send limit. Sends via Gmail, tracks sequence step and next send time per prospect.

### When built, test:

- [ ] Prospect enrolled in sequence -> first email sent during next send window
- [ ] Subsequent emails sent at configured delays (default 3, 5, 10 days)
- [ ] Emails only sent during business hours (9am-5pm ET, Mon-Fri)
- [ ] Daily send limit respected
- [ ] Suppression list checked before sending
- [ ] Sequence stops on reply/bounce/unsubscribe
- [ ] Template variables ({{company}}, {{first_name}}) replaced correctly

---

## 9. Reply/Bounce Monitor

**Status:** Not built

Was n8n WF6 in v1. Monitors Gmail inbox every 30 min, uses LLM to classify replies (interested/not interested/OOO/unsubscribe), detects bounces, sends daily summary to Avi at 5:30pm ET.

### When built, test:

- [ ] Interested reply detected -> prospect status updated, Avi alerted
- [ ] Not-interested reply -> prospect marked, sequence stopped
- [ ] Out-of-office reply -> no status change, logged
- [ ] Unsubscribe reply -> added to suppression list, sequence stopped
- [ ] Bounce detected -> email marked bounced, sequence stopped
- [ ] Daily summary sent to Avi at 5:30pm ET

---

## 10. Monthly Lead Scrape

**Status:** Not built

Was n8n WF7 in v1. Runs 1st of month at 9am ET. Triggers Apify scraper for NYC property management companies, deduplicates results (basic + LLM fuzzy matching), imports to prospects table, auto-enrolls leads with emails into cold email sequence.

### When built, test:

- [ ] Scrape triggered on schedule -> Apify job runs
- [ ] Results deduplicated against existing prospects
- [ ] New prospects imported with source = "apify"
- [ ] Prospects with email auto-enrolled in cold email sequence
- [ ] Duplicate detection catches fuzzy matches (e.g. "ABC Mgmt" vs "ABC Management")
