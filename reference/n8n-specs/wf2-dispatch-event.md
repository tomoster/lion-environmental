# WF2: Avi LPT — Dispatch Events

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Dispatch Events
**Trigger:** Webhook — HTTP POST, path `avi-lpt-dispatch`
**Credential:** Lion Environmental Bot (for Telegram outbound)
**Existing baseline:** `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-broadcast.json` (~80% complete — has webhook trigger, read workers, filter active, broadcast with accept buttons)

This workflow receives events from the Google Apps Script `onEditHandler`. When certain columns in the Sheet are changed, Apps Script fires a POST to this webhook with an event payload. n8n then performs the appropriate action (broadcast a job, notify Avi, etc.).

The Apps Script stores this workflow's webhook URL in its `CONFIG` object as `N8N_WEBHOOK_DISPATCH`. The n8n webhook URL will be of the form `https://[n8n-instance]/webhook/avi-lpt-dispatch`.

---

## Trigger

Webhook node listening for HTTP POST on path `avi-lpt-dispatch`. Respond immediately with a success acknowledgment (do not make the Apps Script wait for downstream processing). Set up the webhook response node to return `{ "status": "received" }` early — then continue processing asynchronously, OR just let n8n respond at the end of the workflow.

---

## Event Routing

Read `body.event` from the incoming POST body. Use a Switch node to route to the correct flow:
- `"job_open"` → **Job Broadcast**
- `"prospect_confirmed"` → **Prospect Confirmed**
- `"invoice_paid"` → **Invoice Paid**
- Anything else → respond with `{ "status": "unknown_event" }` and stop

---

## Flow: Job Broadcast

**Incoming data:**
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

The `serviceType` field is either `"LPT"` or `"Dust Swab"` (from Jobs sheet col R).

**Steps:**

1. Read the Workers sheet (all rows, including headers).
2. Filter to workers where:
   - Column D (Active) = `"Yes"`
   - Column H (Telegram Chat ID) is not empty
3. Determine the service badge and quantity label:
   - If `serviceType` is `"Dust Swab"`: badge = `"[DUST SWAB]"`, quantity label = `"apartments"`
   - Otherwise (LPT or missing): badge = `"[LPT]"`, quantity label = `"units"`
4. For each active worker with a Chat ID, send a Telegram message using the "Lion Environmental Bot" credential:

   **Message text (Markdown parse mode):**
   ```
   🔔 *NEW JOB AVAILABLE* [badge]

   Job #[jobNumber]
   📍 [address]
   🏢 [units] [quantityLabel]
   📅 [scanDate]
   📝 [notes — use "None" if empty]

   First to tap gets the job!
   ```

   **Inline keyboard:**
   - One button: label `"✅ ACCEPT JOB"`, callback_data `"accept_[jobNumber]_[row]"`

5. After all messages are sent, respond to the webhook:
   ```json
   { "status": "dispatched", "workers": [count of workers messaged] }
   ```

**Notes:**
- Use a loop/split node to iterate over the filtered workers list and send one Telegram message per worker.
- The `row` value passed in the webhook body should be passed through to the callback_data so the Accept Job handler in WF1 knows which sheet row to update. If Apps Script doesn't always send the row, read the Jobs sheet in this workflow to find the row number for jobNumber.

---

## Flow: Prospect Confirmed

**Incoming data:**
```json
{
  "event": "prospect_confirmed",
  "company": "Acme Corp",
  "address": "123 Main St",
  "email": "owner@acme.com"
}
```

**Steps:**

1. Send Telegram message to Avi (chat ID 6431723336) with Markdown parse mode:
   ```
   🎉 *New Prospect Confirmed!*

   🏢 [company]
   📍 [address]
   📧 [email]

   A new job has been auto-created in the Jobs tab.
   ```
2. Respond to webhook: `{ "status": "notified" }`

---

## Flow: Invoice Paid

**Incoming data:**
```json
{
  "event": "invoice_paid",
  "invoiceNum": "INV-007",
  "client": "Acme Corp",
  "amount": "480.00"
}
```

**Steps:**

1. Send Telegram message to Avi (chat ID 6431723336) with Markdown parse mode:
   ```
   💰 *Invoice Paid!*

   Invoice #[invoiceNum]
   🏢 [client]
   💵 $[amount]

   Payment has been recorded.
   ```
2. Respond to webhook: `{ "status": "notified" }`

---

## Implementation Notes

- The webhook must be active (not test mode) so Apps Script can reach it. Note the production webhook URL and store it in Apps Script CONFIG.
- For the job broadcast loop: if n8n's native loop runs into issues with multiple Telegram sends, use a Split In Batches node or a Code node that iterates and fires one HTTP request per worker.
- The `row` field in `job_open` events tells WF1's Accept Job handler which sheet row to update. Make sure it flows through into the callback_data string accurately: `"accept_[jobNumber]_[row]"`.
- If `notes` is empty or undefined in the payload, display `"None"` in the broadcast message.
- The workflow should handle cases where no workers are active or none have registered their Telegram Chat IDs — just send no messages and return `{ "status": "dispatched", "workers": 0 }` without erroring.
- **WF2 is DEPLOYED.** These spec changes (service type badge, quantity label) also need to be made in the live n8n workflow, not just in the spec.
