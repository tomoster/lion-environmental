# Lion Environmental — Operations CRM

This file tells the full story of Lion Environmental's operations system: what the business does, what was built (v1), why it's being replaced, and what the new system needs to handle. A new session with just this file should give complete context.

## Workflow

- **Always push after every commit.** Don't wait for the user to ask — commit and push together every time.

## The Business

**Lion Environmental LLC** is a lead paint testing (LPT) and dust swab inspection company in NYC, run by **Avi Bursztyn** and **Tom Oster**. Tom originally consulted for Avi through Pulse Systems, then joined as co-manager. NYC requires pre-1960 buildings to get lead paint inspections. Avi's team goes to buildings, tests apartments, writes reports, and sends them to building owners/property managers.

**Scale:** 5-15 jobs per month. A single job can cover an entire building (20+ units).

**Services:**
- **LPT (Lead Paint Testing)** — XRF scanning of apartments. Pricing: per-unit + per-common-space.
- **Dust Swab** — Wipe sampling. Pricing: site visit ($375) + report ($135) + wipes (qty x $20).

**Key people:**
- **Avi** — Co-manager. Sales calls, client relationships, approves invoices, manages field operations.
- **Tom** — Co-manager. Built the system (originally consulting via Pulse Systems), joined forces with Avi. Operations + system development.
- **Nazish** — Report writer (office role). Receives field data from workers, writes inspection reports, uploads finished PDFs via Telegram.
- **Workers** — Field inspectors (1-3 active). Go to buildings, do the scans/swabs, upload field data via Telegram.

**Business info:**
- Email: lionenvironmentalllc@gmail.com
- Phone: (201) 375-2797
- Zelle: 2013752797
- Check address: 1500 Teaneck Rd #448, Teaneck, NJ 07666
- Tax rate: 8.88%
- Sender name (for emails): Avi Bursztyn
- Timezone: America/New_York (all scheduling is ET, business hours 9am-5pm Mon-Fri)

---

## What Was Built (v1)

The first version was a Google Sheets CRM backed by Apps Script (1,568 lines) with n8n handling all external communications. This was Tom's first Pulse Systems case study.

### Architecture

```
Google Sheet (11 tabs — CRM data)
  |
  +--> Apps Script (thin data layer)
  |      - onEdit triggers fire webhooks to n8n
  |      - doPost API router (generate_invoice, send_invoice, send_report)
  |      - Invoice PDF generation + Google Drive storage
  |      - Sheet formatting, validation, dashboard formulas
  |
  +--> n8n (7 workflows — the orchestration brain)
         - WF1: Telegram Bot — receives all worker/Avi messages, routes commands
         - WF2: Dispatch Events — webhook from Sheet edits (job_open, prospect_confirmed, invoice_paid)
         - WF3: Daily Reminders — 7am ET worker reminders + Avi summary
         - WF4: Overdue Alerts — 8am ET overdue follow-ups + Monday invoice alerts
         - WF5: Cold Email Engine — 4-step sequence, 15-min intervals, business hours
         - WF6: Reply/Bounce Monitor — Gmail inbox monitoring, LLM classification
         - WF7: Monthly Lead Scrape — Apify scraper, LLM dedup, auto-enrollment
```

### What each n8n workflow does

| # | Workflow | Trigger | What it does |
|---|----------|---------|--------------|
| 1 | Telegram Bot | Telegram webhook (continuous) | Central bot: /start registration, accept/complete jobs, invoice approval, report upload, LLM fuzzy name matching. ~60 nodes. |
| 2 | Dispatch Events | HTTP webhook from Apps Script | Receives job_open (broadcast to workers), prospect_confirmed, invoice_paid events. |
| 3 | Daily Reminders | Schedule 7am ET Mon-Sat | Sends workers their daily job reminders via Telegram + Avi gets a summary. |
| 4 | Overdue Alerts | Schedule 8am ET daily | Checks for overdue prospect follow-ups (daily) and overdue invoices (Mondays). Alerts Avi via Telegram. |
| 5 | Cold Email Engine | Schedule every 15 min | Processes cold email queue: reads prospects due for next email, sends via Gmail, updates sheet. Enforces daily limit, business hours, suppression list. 4-step sequence. |
| 6 | Reply/Bounce Monitor | Schedule every 30 min | Monitors Gmail for replies to cold emails. LLM classifies replies (interested/not interested/out of office/unsubscribe). Detects bounces. Daily summary to Avi at 5:30pm. |
| 7 | Monthly Lead Scrape | Schedule 1st of month 9am ET | Runs Apify scraper for property management companies, deduplicates (basic + LLM fuzzy), imports to Prospects sheet, auto-enrolls leads with emails into cold email sequence. |

### Source files

| What | Path | Size |
|------|------|------|
| Apps Script CRM | `pulse-equities/clients/avi-lpt/scripts/setup-sheets-crm.js` | 1,568 lines |
| Lead scraper | `pulse-equities/clients/avi-lpt/scripts/scrape-leads.js` | ~200 lines |
| Lead enricher | `pulse-equities/clients/avi-lpt/scripts/enrich-leads.js` | ~230 lines |
| n8n workflow specs | `pulse-equities/clients/avi-lpt/n8n-specs/` | 7 files + shared context |
| n8n workflow JSONs | `n8n-workflows/pulse-equities/avi-lpt-dispatch/` + `avi-lpt-leads/` | ~280KB |
| Implementation plans | `pulse-equities/docs/plans/2026-02-16-avi-*` | 3 files |

All paths are relative to `~/Documents/projects/`.

---

## Why It's Being Replaced

The Google Sheets + n8n-as-brain approach has serious problems:

1. **Testing nightmare** — Testing requires wiring up Google OAuth, Telegram bot credentials, Sheet IDs, and triggering events at exactly the right moment. There's no way to run a workflow in isolation.

2. **Credential juggling** — Every workflow needs Google Sheets OAuth, Telegram bot tokens, Gmail OAuth, OpenRouter API keys, Apify tokens. Setting up a test environment means configuring all of these.

3. **n8n complexity** — The Telegram bot workflow alone has ~60 nodes. Debugging means clicking through a visual graph node-by-node. There are no stack traces, no breakpoints, no version control diffs.

4. **Logic scattered across systems** — Business logic lives in three places: Apps Script (data layer + invoice generation), n8n (Telegram bot + email engine + alerts), and the Sheet itself (validation rules, formulas). Understanding a feature means jumping between all three.

5. **No code review or versioning** — n8n workflows are JSON blobs. Apps Script changes are manual paste-into-editor. Neither has meaningful git history.

The core problem: a 60-node n8n workflow for one Telegram bot is unmaintainable. The same logic as readable code would be a few hundred lines with tests, version control, and easy debugging.

---

## What the New System Should Replace

The new CRM will be a proper web app with Supabase as the database and business logic in the application code. n8n stays but becomes a lightweight webhook receiver, not the orchestration layer.

| Old system | New system |
|-----------|------------|
| Google Sheets (Prospects, Jobs, Invoices, Workers, etc.) | Supabase tables |
| Apps Script onEdit triggers | Server actions / API routes |
| Apps Script doPost API (generate_invoice, send_invoice, send_report) | App API routes |
| n8n WF1: Telegram Bot (60 nodes) | App logic + lightweight n8n webhook for Telegram |
| n8n WF2: Dispatch Events | Supabase triggers or app logic (on status change) |
| n8n WF3: Daily Reminders | Cron job / edge function |
| n8n WF4: Overdue Alerts | Cron job / edge function |
| n8n WF5: Cold Email Engine | App logic (cron job or edge function) |
| n8n WF6: Reply/Bounce Monitor | App logic (cron job or edge function) |
| n8n WF7: Monthly Lead Scrape | Scheduled job (keep Apify, move orchestration to app) |
| Google Drive (report PDFs, invoice PDFs) | Supabase Storage or keep Google Drive |
| Google Sheet Dashboard (formulas) | App dashboard with real queries |

---

## Business Config

Extracted from the Apps Script CONFIG. No credentials here — just business logic constants.

```
Business Name:        Lion Environmental LLC
Business Email:       lionenvironmentalllc@gmail.com
Business Phone:       (201) 375-2797
Zelle:                2013752797
Check Payable To:     1500 Teaneck Rd #448, Teaneck, NJ 07666
Tax Rate:             8.88%
Sender Name:          Avi Bursztyn

LPT Pricing:          Per-unit + per-common-space (variable, entered per job)

Dust Swab Pricing:
  Site Visit:         $375
  Report:             $135
  Wipe Rate:          $20/wipe

Cold Email:
  Sequence Steps:     4 emails
  Send Window:        9am-5pm ET, Mon-Fri
  Daily Send Limit:   Configurable (default 10)
  Step Delays:        Configurable (default 3, 5, 10 days)

Scheduling:
  Timezone:           America/New_York
  Worker Reminders:   7am ET Mon-Sat
  Overdue Alerts:     8am ET daily
  Invoice Alerts:     Mondays only
  Lead Scrape:        1st of month, 9am ET
```

---

## Data Model Reference

The v1 system has 11 Google Sheet tabs. This is the starting point for designing Supabase tables.

### Prospects (columns A-M)

| Column | Field | Type/Notes |
|--------|-------|------------|
| A | Company | Business name |
| B | Contact Name | Full name |
| C | Phone | Formatted (###) ###-#### |
| D | Email | |
| E | Building Address | |
| F | Status | New / Called / Qualified / Pricing Sent / Follow-up / Confirmed / Lost |
| G | Next Follow-up | Date |
| H | Date Added | Date |
| I | Source | manual / apify |
| J | Seq Status | not_started / active / completed / replied / bounced / unsubscribed |
| K | Seq Step | Number 1-4 |
| L | Next Send | Datetime |
| M | Service Interest | LPT / Dust Swab / Both |

### Jobs (columns A-R)

| Column | Field | Type/Notes |
|--------|-------|------------|
| A | Job # | |
| B | Client/Company | |
| C | Client Email | |
| D | Building Address | |
| E | # Units | |
| F | Price/Unit | |
| G | # Common Spaces | |
| H | Price/Common Space | |
| I | Scan Date | Date |
| J | Notes | |
| K | Assigned Worker | Worker name |
| L | Dispatch Status | Not Dispatched / Open / Assigned / Completed |
| M | Report Writer | |
| N | Report Status | Scheduled / In Progress / Field Work Done / Lab Results Pending / Writing Report / Report Sent / Complete |
| O | Report File | Google Drive file ID |
| P | Invoice # | |
| Q | Profit | |
| R | Service Type | LPT / Dust Swab |

### Invoices (columns A-J)

| Column | Field | Type/Notes |
|--------|-------|------------|
| A | Invoice # | |
| B | Job # | |
| C | Client/Company | |
| D | Address | |
| E | Amount | |
| F | Date Sent | Date |
| G | Due Date | Date |
| H | Status | Pending / Sent / Paid / Overdue |
| I | Date Paid | Date |
| J | Notes | Contains "Drive:fileId" for invoice PDF |

### Workers (columns A-H)

| Column | Field | Type/Notes |
|--------|-------|------------|
| A | Name | |
| B | Phone | |
| C | Email | |
| D | Active | Yes / No |
| E | Specialization | |
| F | Rate | |
| G | Jobs Done | Calculated |
| H | Telegram Chat ID | Numeric, from /start registration |

### Worker Payments

Payment log with worker name, amount, date, confirmation number. Tracks Zelle payments.

### Email Templates

Key-value config sheet. Settings: Subject Line, Email 1-4 (body templates with {{company}}, {{first_name}}), step delays, send window, daily limit, sender name, unsubscribe footer.

### Email Log (columns A-H)

| Column | Field |
|--------|-------|
| A | Timestamp |
| B | Prospect Row |
| C | Company |
| D | Email |
| E | Step |
| F | Subject |
| G | Status (sent/bounced/failed) |
| H | Error |

### Suppression List (columns A-C)

| Column | Field |
|--------|-------|
| A | Email |
| B | Reason |
| C | Date Added |

### Other tabs

- **Dashboard** — Formulas showing pipeline counts, revenue, worker stats.
- **This Week** — Weekly job schedule view.
- **Invoice Template** — Auto-fills from job data to generate PDF.

---

## API Contracts (v1 reference)

### Apps Script -> n8n (webhook events)

Apps Script fires HTTP POST to n8n on sheet edits:

- **job_open** — Dispatch Status set to "Open". Payload: jobNumber, client, address, units, scanDate, notes, serviceType, row.
- **prospect_confirmed** — Prospect Status set to "Confirmed". Payload: company, address, email.
- **invoice_paid** — Invoice Status set to "Paid". Payload: invoiceNum, client, amount.

### n8n -> Apps Script (API calls)

n8n calls Apps Script web app via HTTP POST with `{ action, ...params }`:

- **generate_invoice** — `{ jobNum }` -> invoice details + Drive file ID
- **send_invoice** — `{ invoiceNum }` -> emails PDF to client
- **send_report** — `{ jobNum }` -> emails report to client
- **save_report_file** — `{ jobNum, fileUrl, fileName }` -> saves to Drive

---

## Open Questions

Things to decide before building the new system:

1. **Telegram dispatch — keep or replace?** Workers currently communicate entirely via Telegram (accept jobs, mark complete, upload reports). Keep Telegram? Move to in-app notifications + SMS? Or a hybrid?

2. **n8n — keep for anything?** The plan is to move orchestration to the app. Does n8n stay as a lightweight Telegram webhook bridge, or go fully app-based (direct Telegram Bot API)?

3. **Multi-tenant or single-tenant?** Build just for Avi, or design for other Pulse Systems clients from the start? Multi-tenant adds complexity but prevents a rewrite later.

4. **Cold email engine — keep or defer?** The 4-step cold email sequence with reply/bounce monitoring is complex. Build it in v1 of the new system or defer to phase 2?

5. **Lead scraping — keep Apify?** The current setup uses Apify for Google Maps scraping. Keep it? Find an alternative? The app would just need to trigger and ingest results.

6. **Workers — app access or Telegram only?** Do workers get their own app login (see assigned jobs, mark complete, upload reports in the app)? Or keep them on Telegram since it's what they know?

7. **Invoicing — generate in-app or integrate?** Currently generates PDFs in Google Drive via Apps Script. Build PDF generation in the app? Integrate with QuickBooks/Stripe? Keep Google Drive for storage?

8. **Report storage** — Keep Google Drive for report PDFs, or move to Supabase Storage?

9. **Worker field data uploads** — Workers currently upload raw field data (CamScanner sketches, XRF data sheets) that Nazish uses to build reports. The bot could distinguish uploads by role: field worker uploads → "field data" (routed to report writer), office uploads → "finished report" (attached to job). Deferred for now.

---

## Reference Files

Detailed specs and context are in the `reference/` folder:

- `reference/shared-context.md` — Full sheet structure, API contracts, config values, credential names
- `reference/README.md` — Original project README with setup instructions and architecture
- `reference/TODO.md` — Original status tracker showing what was built and what's pending
- `reference/n8n-specs/wf1-wf7` — Detailed specs for each n8n workflow

For the full Apps Script source (1,568 lines), see:
`~/Documents/projects/pulse-equities/clients/avi-lpt/scripts/setup-sheets-crm.js`

For n8n workflow JSON files, see:
`~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/` and `avi-lpt-leads/`

For implementation plans, see:
`~/Documents/projects/pulse-equities/docs/plans/2026-02-16-avi-*`
