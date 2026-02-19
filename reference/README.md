# Avi's Lead Paint Testing — End-to-End System

## Overview

Avi runs a Lead Paint Testing business in NYC, targeting landlords and property managers with pre-1960 buildings. This system automates his entire operation: finding leads, tracking prospects, managing jobs, dispatching workers via Telegram, invoicing, and paying workers — all from one Google Sheet with one Apps Script file. No external servers needed.

**Scale**: 5-15+ jobs/month, where a single job can be a whole building (20+ units)

## What's Automated vs Manual

| Automated | Avi does manually |
|-----------|-------------------|
| Monthly lead scrape delivers 200+ new prospects to his sheet | Cold calls prospects and updates their status |
| Job broadcast to all workers via Telegram when Dispatch Status = "Open" | Sets Dispatch Status to "Open" when job is ready |
| First worker to tap "Accept" gets auto-assigned in the Sheet | — |
| Morning-of reminder with "Mark Complete" button sent to assigned worker | — |
| Invoice PDF auto-generated when worker marks "Complete" | Taps "Approve & Send" on Telegram to email invoice to client |
| Daily 8am email if follow-ups are overdue | Makes the actual follow-up calls |
| Dashboard auto-updates with pipeline/revenue stats | Enters job details, scan dates |

## Architecture

Everything runs inside Google's infrastructure — zero external servers:

```
Google Sheet (CRM data)
  └── Apps Script (all logic)
        ├── onEdit triggers (status changes, dispatch)
        ├── Time triggers (daily reminders, overdue alerts)
        ├── Telegram Bot API (worker communication)
        └── Polling trigger (checks for Telegram updates every minute)
```

## Setup (One-Time)

### Step 1: Create the Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot`
3. Name it "Lion Environmental" and pick a username like `LionEnvironmentalBot`
4. Copy the bot token (looks like `7123456789:AAH...`)

### Step 2: Create the CRM Sheet

1. Create a new Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code
4. Paste the entire contents of `scripts/setup-sheets-crm.js`
5. Click **Run > setupCRM**
6. Grant permissions when prompted
7. Your 8-tab CRM is ready

### Step 3: Configure

In the Apps Script editor, find the `CONFIG` object at the top and fill in:

```javascript
var CONFIG = {
  NOTIFICATION_EMAIL: 'lionenvironmentalllc@gmail.com',
  BUSINESS_NAME: 'Lion Environmental LLC',
  BUSINESS_EMAIL: 'lionenvironmentalllc@gmail.com',
  BUSINESS_PHONE: '(201) 375-2797',
  ZELLE_INFO: '2013752797',
  CHECK_ADDRESS: '1500 Teaneck Rd #448, Teaneck, NJ 07666',
  UNIT_PRICE: 165,
  TAX_RATE: 0.0888,
  TELEGRAM_BOT_TOKEN: 'paste-bot-token-here',
  AVI_CHAT_ID: '',       // Filled after Avi /starts the bot
  NAZISH_CHAT_ID: '',    // Filled after Nazish /starts the bot
};
```

Save the script after editing.

### Step 4: Install Automations

1. Open the Google Sheet
2. Click **LPT Tools > Install Automations**
3. Grant permissions when prompted
4. Done — all triggers are now running

This installs:
- **onEdit trigger**: Handles prospect confirmations, job dispatch, invoice generation
- **Daily 7am trigger**: Sends workers their job reminders via Telegram
- **Daily 8am trigger**: Checks for overdue follow-ups, emails Avi
- **Weekly Monday trigger**: Checks for overdue invoices, emails Avi

### Step 5: Onboard Workers

Each worker does this once:
1. Open Telegram and search for the bot (e.g., `@LionEnvironmentalBot`)
2. Send `/start`
3. Type their full name (must match the Workers tab in the Sheet)
4. They'll get a confirmation message

Avi and Nazish should also /start the bot. After they do, check the Workers tab for their Telegram Chat IDs, then paste those into the CONFIG as `AVI_CHAT_ID` and `NAZISH_CHAT_ID`.

### Step 6: Set Up Monthly Lead Scrape (Optional)

See the n8n workflow at `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-leads/` for automated monthly lead generation. This requires n8n access — deployment instructions are in that directory's README.

## CRM Tabs

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Business stats at a glance — pipeline counts, revenue, worker payments |
| **Prospects** | Sales pipeline with status dropdowns (New > Called > Qualified > Pricing Sent > Confirmed) |
| **Jobs** | Active and completed work — building address, units, worker assignments, dispatch + report status |
| **Invoices** | Billing tracker — amounts, payment status, dates |
| **Workers** | Team roster with auto-calculated total jobs, payments, and Telegram Chat IDs |
| **Worker Payments** | Every Zelle payment logged with confirmation numbers |
| **This Week** | Weekly job schedule at a glance |
| **Invoice Template** | Professional invoice that auto-fills from job data |

## Automations

### Telegram Worker Dispatch

1. Avi enters job details in the Jobs tab and sets Dispatch Status to "Open"
2. All active workers with Telegram linked get a notification with job details + "Accept" button
3. First worker to accept gets assigned — Sheet updates automatically, Avi gets notified
4. Morning of the job (7am ET), the assigned worker gets a reminder with a "Mark Complete" button
5. Tapping "Mark Complete" updates the Sheet, alerts Nazish (report writer), and auto-generates an invoice
6. Avi gets the invoice summary on Telegram with an "APPROVE & SEND" button
7. Tapping the button emails the PDF invoice to the client automatically

### Auto-Invoice on Job Completion

When a worker taps "Mark Complete" on Telegram:
1. The Sheet updates: Dispatch Status → "Completed", Report Status → "Scanning Done"
2. An invoice row is created in the Invoices tab with job details + calculated totals
3. The Invoice Template is populated with client/building info
4. A PDF is generated and saved to Google Drive ("LPT Invoices" folder)
5. Avi gets a Telegram message with the invoice summary + "APPROVE & SEND" button
6. Avi taps the button → PDF is emailed to the client automatically

**Note:** The XRF report is only sent to the client after Avi confirms payment — that's a separate manual step.

### Daily Follow-up Reminders

Every day at 8am ET, the system checks for prospects with overdue follow-up dates. If any exist (and they aren't "Confirmed" or "Lost"), Avi gets an email listing each company, contact name, and phone number.

### Manual Invoice Generation

Still available via **LPT Tools > Generate Invoice from Job** for creating invoices outside the auto-trigger flow.

## Key Sheet Columns

- Jobs tab: "Dispatch Status" (col 13) — Not Dispatched / Open / Assigned / Completed
- Jobs tab: "Client Email" (col 14) — copied from Prospects when status changes to Confirmed
- Workers tab: "Telegram Chat ID" (col 8) — auto-filled when workers /start the bot

## Updating the Script

To update the code without losing data:
1. Open the Google Sheet → Extensions → Apps Script
2. Paste the updated code (overwrites functions, doesn't touch sheet data)
3. If the update adds new columns, run the migration function once (included in the update)
4. No redeployment needed — polling picks up changes automatically

**Never re-run `setupCRM()`** on a sheet with data — it creates tabs from scratch.

## File Structure

```
clients/avi-lpt/
├── README.md                 # This file
├── TODO.md                   # Deployment checklist
├── package.json              # Node.js project config
├── scripts/
│   ├── setup-sheets-crm.js   # Google Apps Script — CRM + Telegram dispatch + invoicing
│   ├── scrape-leads.js       # Apify Google Maps scraper (backup/manual)
│   └── enrich-leads.js       # Leads Finder enrichment (backup/manual)
└── data/                     # Generated lead data (gitignored)
```

Everything runs from `setup-sheets-crm.js` — one file, pasted into Google Apps Script.

The n8n workflow files at `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/` are the original n8n-based version (now superseded by the built-in Apps Script approach). The lead scraping workflow at `avi-lpt-leads/` is still used if automated monthly scraping is set up.

## Troubleshooting

- **Workers not getting messages?** Check the Workers tab — they need Active = "Yes" and a Telegram Chat ID filled in.
- **Bot not responding?** Check that `Install Automations` was run — it sets up the polling trigger. Also verify the bot token in CONFIG is correct.
- **"Job already taken" immediately?** Two workers tapped Accept at nearly the same time. First one wins.
- **Daily reminders not sending?** Check that the Scan Date matches today's date exactly and Dispatch Status is "Assigned".
- **Invoice not generating?** Check the Apps Script execution log (View > Executions) for errors.
- **Invoice email not sending?** Check that the job has a Client Email in col 14 of the Jobs tab.

## Metrics to Track

- Leads generated per month (auto from n8n workflow)
- Call-to-close rate (prospects > confirmed)
- Average time from first call to job completion
- Invoices sent vs paid (and average days to payment)
- Monthly revenue and worker costs
- Jobs per worker per month
