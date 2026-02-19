# Avi LPT — To-Do List

## DONE

### Script Build (v1 — Pure Apps Script)
- [x] Full Apps Script CRM: Prospects, Jobs, Invoices, Workers, Worker Payments, This Week, Dashboard, Invoice Template
- [x] Telegram dispatch: broadcast jobs, accept, mark complete, daily reminders
- [x] Auto-invoicing: PDF generation, Drive storage, email to client via Avi approval
- [x] Report flow: Nazish sends PDF to bot, auto-matches job, Avi approves, emailed to client
- [x] Per-job pricing (Price/Unit + Price/Common Space instead of fixed rate)
- [x] Cold email engine: 4-step sequence, send window, suppression list
- [x] Reply/bounce detection with LLM classification
- [x] Apify lead import with LLM deduplication

### Migration to n8n (v2)
- [x] Rewrote Apps Script as thin data layer (~1360 lines, down from ~2870)
- [x] Added fireN8nEvent() — fires webhooks to n8n on sheet edits
- [x] Rewrote doPost() as API router (generate_invoice, send_invoice, send_report)
- [x] Removed all Telegram functions (16), email engine (14), reply/bounce (7), alerts (2), import (3)
- [x] Wrote detailed specs for all 7 n8n workflows

### Multi-Service Support (LPT + Dust Swab)
- [x] Added Service Type column (Jobs col R) — LPT / Dust Swab
- [x] Added Service Interest column (Prospects col M) — LPT / Dust Swab / Both
- [x] Updated Report Status: Scanning Done → Field Work Done, added Lab Results Pending
- [x] Dust swab invoice template: Site Visit ($375) + Report ($135) + Wipes (qty × $20)
- [x] Service-type-aware email prompts (invoice + report emails)
- [x] Idempotent migration function (migrateToMultiService)
- [x] Updated n8n specs (shared context, WF1, WF2, WF3)
- [x] Deployed web app: script.google.com URL saved in 00-shared-context.md
- [x] Updated OpenRouter API key
- [ ] Run migration on Avi's live spreadsheet
- [ ] Update credentials (now have access to lionenvironmentalllc@gmail.com)

## CURRENT — Build n8n Workflows

Specs are in `clients/avi-lpt/n8n-specs/`. Build in the n8n project (`~/Documents/projects/n8n-workflows/`).

### Phase 1: Telegram Bot + Dispatch (fixes core pain point)
- [ ] Build WF1: `avi-lpt-telegram-bot` (spec: wf1-telegram-bot.md)
- [ ] Build WF2: `avi-lpt-dispatch-event` (spec: wf2-dispatch-event.md)
- [ ] Configure credentials: Telegram bot, Google Sheets OAuth, OpenRouter
- [ ] Set Apps Script web app URL in WF1 Code nodes (URL in 00-shared-context.md)
- [ ] Set n8n WF2 webhook URL in Apps Script CONFIG.N8N_WEBHOOK_DISPATCH
- [ ] Update WF2 (deployed) to include serviceType badge + apartments/units label
- [ ] **Test:** Open → broadcast → accept → complete → invoice → approve → email

### Phase 2: Reminders + Alerts
- [ ] Build WF3: `avi-lpt-daily-reminders` (spec: wf3-daily-reminders.md)
- [ ] Build WF4: `avi-lpt-overdue-alerts` (spec: wf4-overdue-alerts.md)
- [ ] **Test:** Verify correct timing and content

### Phase 3: Cold Email Engine + Reply/Bounce
- [ ] Build WF5: `avi-lpt-email-engine` (spec: wf5-email-engine.md)
- [ ] Build WF6: `avi-lpt-reply-bounce-monitor` (spec: wf6-reply-bounce-monitor.md)
- [ ] **Test:** Enroll test prospect, verify sequence + reply detection

### Phase 4: Lead Import + Go Live
- [ ] Build WF7: `avi-lpt-monthly-lead-scrape` (spec: wf7-monthly-lead-scrape.md)
- [ ] Full end-to-end test with production-like data
- [ ] Ship to Avi

## BACKLOG
- [ ] Create Avi's production bot via @BotFather (`LionEnvironmentalBot`)
- [ ] Onboard Avi, Nazish, and real workers
- [ ] Set up Apify actor for NJ/NY property management companies
