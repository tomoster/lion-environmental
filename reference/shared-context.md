# Shared Context — Avi LPT n8n Workflows

This document is referenced by all 7 workflow specs. It defines the Google Sheet structure, config values, API contracts, credentials, and existing workflow baselines.

---

## Google Sheet

**Sheet name:** Avi LPT - Lion Environmental CRM
**Sheet ID:** configured per-deployment as a variable/constant in each workflow

### Prospects Sheet (columns A-M)

| Col | Field | Notes |
|-----|-------|-------|
| A | Company | Business name |
| B | Contact Name | Full name |
| C | Phone | |
| D | Email | |
| E | Building Address | |
| F | Status | One of: New / Called / Qualified / Pricing Sent / Follow-up / Confirmed / Lost |
| G | Next Follow-up | Date |
| H | Date Added | Date |
| I | Source | |
| J | Seq Status | One of: not_started / active / completed / replied / bounced / unsubscribed |
| K | Seq Step | Number 1-4 |
| L | Next Send | Datetime (ISO or formatted) |
| M | Service Interest | One of: LPT / Dust Swab / Both |

### Jobs Sheet (columns A-R)

| Col | Field | Notes |
|-----|-------|-------|
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
| K | Assigned Worker | Worker's name |
| L | Dispatch Status | One of: Not Dispatched / Open / Assigned / Completed |
| M | Report Writer | |
| N | Report Status | One of: Scheduled / In Progress / Field Work Done / Lab Results Pending / Writing Report / Report Sent / Complete |
| O | Report File | Google Drive file ID |
| P | Invoice # | |
| Q | Profit | |
| R | Service Type | One of: LPT / Dust Swab |

### Invoices Sheet (columns A-J)

| Col | Field | Notes |
|-----|-------|-------|
| A | Invoice # | |
| B | Job # | |
| C | Client/Company | |
| D | Address | |
| E | Amount | |
| F | Date Sent | Date |
| G | Due Date | Date |
| H | Status | One of: Pending / Sent / Paid / Overdue |
| I | Date Paid | Date |
| J | Notes | Contains "Drive:fileId" for the invoice PDF |

### Workers Sheet (columns A-H)

| Col | Field | Notes |
|-----|-------|-------|
| A | Name | |
| B | Phone | |
| C | Email | |
| D | Active | "Yes" or "No" |
| E | Specialization | |
| F | Rate | |
| G | Jobs Done | |
| H | Telegram Chat ID | Numeric ID, populated via /start registration |

### Email Templates Sheet

Row 1 is headers. Column A = setting name, Column B = value.

Setting names (exact strings to read from column A):
- `Subject Line` — the cold email subject template (supports `{{company}}`, `{{first_name}}`)
- `Email 1` through `Email 4` — body templates (same variables)
- `Step 1→2 Delay (days)`, `Step 2→3 Delay (days)`, `Step 3→4 Delay (days)` — numeric day counts
- `Send Window Start (ET)` — hour in 24h format, e.g. "9"
- `Send Window End (ET)` — hour in 24h format, e.g. "17"
- `Daily Send Limit` — numeric
- `Sender Name` — display name for outbound emails
- `Unsubscribe Footer` — appended to every email body

### Email Log Sheet (columns A-H)

| Col | Field |
|-----|-------|
| A | Timestamp |
| B | Prospect Row (row number in Prospects sheet) |
| C | Company |
| D | Email |
| E | Step |
| F | Subject |
| G | Status ("sent" / "bounced" / "failed") |
| H | Error (empty if success) |

### Suppression List Sheet (columns A-C)

| Col | Field |
|-----|-------|
| A | Email |
| B | Reason |
| C | Date Added |

---

## Config Values

| Key | Value |
|-----|-------|
| Telegram Bot Username | @Aviburs_test_bot |
| Telegram Bot Token | REDACTED |
| Avi's Telegram Chat ID | 6431723336 |
| Nazish's Telegram Chat ID | 6431723336 (same as Avi for now — will change later) |
| Business Name | Lion Environmental LLC |
| Business Phone | (201) 375-2797 |
| Business Email | lionenvironmentalllc@gmail.com |
| Zelle | 2013752797 |
| Check Payable To / Address | 1500 Teaneck Rd #448, Teaneck, NJ 07666 |
| OpenRouter API Key | REDACTED |
| OpenRouter Model | anthropic/claude-3.5-haiku |

### Dust Swab CONFIG Defaults

| Key | Value |
|-----|-------|
| DUST_SWAB_SITE_VISIT | 375 |
| DUST_SWAB_REPORT | 135 |
| DUST_SWAB_WIPE_RATE | 20 |

---

## API Contract: n8n → Apps Script

Apps Script is deployed as a web app. n8n calls it via HTTP POST with JSON body `{ action, ...params }`. All requests are unauthenticated (Apps Script is set to "Anyone" access).

**Web App URL:** `https://script.google.com/macros/s/AKfycbzAlGQztdCJR-JqP2LG1SLfORzBXSkP7NjyVMz9YFIMoqAHx4hG0mpWNHqF7RE_OLuDzQ/exec`

### Actions

**`generate_invoice`**
- Params: `{ jobNum }`
- Returns success: `{ success: true, invoiceNum, jobNum, client, address, amount, clientEmail, driveFileId }`
- Returns failure: `{ success: false, error }`

**`send_invoice`**
- Params: `{ invoiceNum }`
- Returns success: `{ success: true, sentTo }` (sentTo = email address string)
- Returns failure: `{ success: false, error }`

**`send_report`**
- Params: `{ jobNum }`
- Returns success: `{ success: true, sentTo }`
- Returns failure: `{ success: false, error }`

**`save_report_file`**
- Params: `{ jobNum, fileUrl, fileName }`
- fileUrl format: `"telegram:[fileId]"` OR a direct download URL
- Returns: `{ success: true, fileId }` or `{ success: false, error }`

---

## API Contract: Apps Script → n8n

Apps Script fires HTTP POST webhooks to n8n. The webhook URL is stored in Apps Script CONFIG as `N8N_WEBHOOK_DISPATCH`. Apps Script fires these from its `onEditHandler` trigger.

### Events

**`job_open`** — fired when Dispatch Status is set to "Open"
```json
{
  "event": "job_open",
  "jobNumber": "5",
  "client": "Acme Corp",
  "address": "123 Main St",
  "units": "24",
  "scanDate": "2026-02-20",
  "notes": "Bring ladder",
  "serviceType": "LPT",
  "row": 3
}
```

**`prospect_confirmed`** — fired when Prospect Status is set to "Confirmed"
```json
{
  "event": "prospect_confirmed",
  "company": "Acme Corp",
  "address": "123 Main St",
  "email": "owner@acme.com"
}
```

**`invoice_paid`** — fired when Invoice Status is set to "Paid"
```json
{
  "event": "invoice_paid",
  "invoiceNum": "INV-007",
  "client": "Acme Corp",
  "amount": "480.00"
}
```

---

## Conversation State (Telegram Bot)

The Telegram bot (WF1) needs to track per-user conversation state. Use n8n's workflow static data via `$getWorkflowStaticData('global')` in Code nodes.

State shape (keyed by chatId):
```json
{
  "awaiting_name": { "6431723336": true },
  "awaiting_job_number": { "6431723336": true },
  "pending_report": {
    "6431723336": { "fileId": "...", "fileName": "report.pdf" }
  }
}
```

Set state with `staticData.awaiting_name[chatId] = true`, clear with `delete staticData.awaiting_name[chatId]`.

---

## n8n Credentials

These credentials must be configured in the n8n instance before building:

| Credential Name | Type | Details |
|----------------|------|---------|
| Lion Environmental Bot | Telegram API | Token: REDACTED |
| Avi's Google Sheets | Google Sheets OAuth2 | Access to the LPT sheet |
| Avi's Gmail | Gmail OAuth2 | lionenvironmentalllc@gmail.com |
| OpenRouter API | HTTP Header Auth | Header: Authorization, Value: Bearer REDACTED |
| Apify API Token | HTTP Query Auth | Token for Apify scraper actor |

---

## Existing Workflow Files (Baselines)

These partial workflows already exist and should be built upon rather than starting from scratch:

**Telegram bot (~60% complete)**
`~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-responses.json`
- Has: /start, name matching, accept job, complete job, send_invoice flows
- Missing: document upload, report handling, LLM fuzzy name matching

**Job broadcast (~80% complete)**
`~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-broadcast.json`
- Has: webhook trigger, read workers, filter active, broadcast with accept buttons

**Daily reminders (~90% complete)**
`~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-daily-reminder.json`
- Has: schedule trigger, read jobs+workers, filter today's jobs, send reminders + Avi summary

**Monthly lead scrape (functional)**
`~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-leads/workflow.json`
- Has: schedule trigger, Apify scrape, transform, dedupe by phone/name, filter existing, append to sheet, email notification
- Needs: LLM fuzzy dedup, auto-enroll with email, Telegram notification

---

## Apps Script Web App URL

The Apps Script web app URL is not known at spec-writing time — it depends on the deployment. In every workflow that calls Apps Script, store the URL as a variable in the first Code node or as an n8n expression/constant. Use a clearly named variable like `APPS_SCRIPT_URL` so it can be updated easily after deployment.

---

## Timezone Note

All scheduling uses `America/New_York` (Eastern Time). Business hours are 9:00 AM - 5:00 PM ET, Monday-Friday. When computing "next business day" logic, account for Saturday → Monday and Sunday → Monday jumps.
