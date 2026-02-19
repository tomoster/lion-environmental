# WF1: Avi LPT — Telegram Bot

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Telegram Bot
**Trigger:** Telegram Trigger (webhook-based, listens continuously)
**Credential:** Lion Environmental Bot
**Existing baseline:** `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-dispatch/workflow-responses.json` (~60% complete — has /start, name matching, accept, complete, send_invoice flows; missing document upload, report handling, LLM fuzzy matching)

This is the central bot. It receives all incoming Telegram messages from workers and Avi and routes them to the right handler. It also fires outbound messages to Avi when jobs are completed and invoices/reports are ready for approval.

---

## Trigger Setup

Use the Telegram Trigger node with the "Lion Environmental Bot" credential. Configure it to receive:
- Text messages
- Callback queries (from inline keyboard buttons)
- Document messages (file uploads)

---

## Message Routing

The first step after the trigger is a routing Code node (or Switch node) that classifies the incoming update.

Classification logic (in priority order):
1. If `callback_query` and `callback_data` starts with `accept_` → **Accept Job**
2. If `callback_query` and `callback_data` starts with `complete_` → **Complete Job**
3. If `callback_query` and `callback_data` starts with `sendinv_` → **Send Invoice**
4. If `callback_query` and `callback_data` starts with `reportfor_` → **Report For Job**
5. If `callback_query` and `callback_data` starts with `sendreport_` → **Send Report**
6. If text message and text is `/start` → **Start/Registration**
7. If text message (not `/start`) → **Name or Job Number Response**
8. If document message → **Document Upload**
9. Anything else → stop (ignore silently)

Key fields to extract from the incoming update:
- `chatId` — from `message.chat.id` or `callback_query.message.chat.id`
- `messageText` — from `message.text` (if text message)
- `callbackData` — from `callback_query.data` (if callback_query)
- `callbackQueryId` — from `callback_query.id` (needed to acknowledge button taps)
- `document.file_id` — from `message.document.file_id` (if document)
- `document.file_name` — from `message.document.file_name`
- `caption` — from `message.caption` (sometimes attached to documents)

---

## Flow: /start Registration

**Trigger:** text message = `/start`

1. Read global static data. Set `staticData.awaiting_name[chatId] = true`.
2. Send Telegram message to `chatId`:
   ```
   Welcome to Lion Environmental! 🦁

   What's your full name? (Must match your name in the team sheet)
   ```

---

## Flow: Name or Job Number Response

**Trigger:** text message that is NOT `/start`

This is a multiplexer — check static data to determine what we're waiting for.

**Step 1: Read static data** and check state for this chatId.

**Branch A — Awaiting name:**
- If `staticData.awaiting_name[chatId]` is true:
  1. Take the message text as the entered name.
  2. Delete `staticData.awaiting_name[chatId]`.
  3. Read Workers sheet (all rows).
  4. Extract list of names from column A.
  5. **Simple match first:** lowercase and trim both the entered name and each worker name. Check if any worker name includes the entered name or vice versa.
  6. **If simple match fails:** call OpenRouter API (HTTP POST to `https://openrouter.ai/api/v1/chat/completions`) with the "OpenRouter API" credential:
     - Model: `anthropic/claude-3.5-haiku`
     - Max tokens: 40
     - System message: `"The user typed their name to register in a system. Match it to one of the workers in the list. Account for typos, nicknames (Tom/Thomas, Jon/John, Bob/Robert, Mike/Michael), and spelling variations (Mohamad/Mohammed/Muhammad). Return ONLY the exact name from the list, or 'none' if no reasonable match. No explanation."`
     - User message: `"User typed: '[enteredName]'\n\nWorkers:\n[worker names, one per line]"`
  7. Parse the LLM response. Trim whitespace. If the result is `"none"` or empty: reply to chatId `"❌ Couldn't find '[enteredName]' in the team sheet. Check the spelling and try again, or ask Avi to add you."` and stop.
  8. If a match is found:
     - Write `chatId` to column H of the matched worker's row in the Workers sheet.
     - Reply: `"✅ You're linked, [matchedName]! You'll get job notifications here from now on."`

**Branch B — Awaiting job number (document upload context):**
- If `staticData.awaiting_job_number[chatId]` is true:
  1. Try to extract a number from the message text (strip non-digits, parse integer).
  2. If no number found: reply `"Please type the job number (just the number, e.g. '5')."` and stop.
  3. If number found:
     - Delete `staticData.awaiting_job_number[chatId]`.
     - Retrieve the pending report from `staticData.pending_report[chatId]` (has `fileId`, `fileName`).
     - Delete `staticData.pending_report[chatId]`.
     - Route to **Report Upload Processing** with: chatId, fileId, fileName, jobNum.

**Branch C — Awaiting nothing:**
- Reply: `"Use the buttons to interact with jobs, or send /start to link your account."`

---

## Flow: Accept Job

**Trigger:** callback_data starts with `accept_`

Callback data format: `accept_JOBNUM_ROW` (e.g., `accept_5_3`)

1. Parse jobNumber and row from callback data: split by `_`, index 1 = jobNum, index 2 = row.
2. **Answer the callback query** (send `answerCallbackQuery` to Telegram with the `callbackQueryId`) to dismiss the loading spinner.
3. Read the Jobs sheet (all rows).
4. Find the row where column A (Job #) equals jobNum.
5. Check column L (Dispatch Status):
   - If NOT "Open": send message to chatId: `"Sorry, this job has already been taken! ⏳"` and stop.
   - If "Open":
     a. Update that row:
        - Column K (Assigned Worker): set to the worker's first name. To get the worker's name, look up the Workers sheet by the chatId in column H.
        - Column L (Dispatch Status): set to `"Assigned"`
     b. Send to chatId:
        ```
        ✅ You're assigned to Job #[jobNum]!

        📍 [address from col D]
        📅 [scanDate from col I]

        You'll get a reminder with details the morning of the job.
        ```
     c. Send to Avi (chat ID 6431723336):
        ```
        [workerName] accepted Job #[jobNum] — [client] at [address], [scanDate]
        ```

---

## Flow: Complete Job

**Trigger:** callback_data starts with `complete_`

Callback data format: `complete_JOBNUM_ROW`

1. Parse jobNumber from callback data.
2. Answer the callback query.
3. Read Jobs sheet, find the job row by Job # (column A).
4. Update that row:
   - Column L (Dispatch Status): `"Completed"`
   - Column N (Report Status): `"Field Work Done"`
5. Send to chatId: `"Thanks! ✅ Nazish will be in touch about the report."`
6. Read the service type from column R of the job row. Determine the quantity label: `"apartments"` for Dust Swab, `"units"` for LPT.
7. Send to Nazish (chat ID 6431723336):
   ```
   📋 Job #[jobNum] complete — ready for report. [serviceType from col R]

   [client from col B]
   [address from col D]
   [units from col E] [quantityLabel]
   ```
8. Call Apps Script API via HTTP POST (note: pass service type context so the invoice reflects the correct service):
   - URL: `APPS_SCRIPT_URL` (variable)
   - Body: `{ "action": "generate_invoice", "jobNum": "[jobNum]" }`
9. Check the response body:
   - If `success` is false: send to Avi `"⚠️ Invoice generation failed for Job #[jobNum]: [error]"` and stop.
   - If `success` is true:
     - Format amount to 2 decimal places (e.g., `"480.00"`).
     - Send to Avi (6431723336) with **Markdown parse mode**:
       ```
       📄 *INVOICE READY*

       Invoice #[invoiceNum] for Job #[jobNum]
       *Client:* [client]
       *Address:* [address]
       *Amount:* $[amount]
       *Email:* [clientEmail or "Not set"]
       ```
     - Include an inline keyboard button on that message:
       - Label: `"✅ APPROVE & SEND TO CLIENT"`
       - callback_data: `"sendinv_[invoiceNum]"`

---

## Flow: Send Invoice

**Trigger:** callback_data starts with `sendinv_`

Callback data format: `sendinv_INVOICENUM` (e.g., `sendinv_INV-007`)

1. Parse invoiceNum from callback data (everything after the first `_`).
2. Answer the callback query.
3. Call Apps Script API via HTTP POST:
   - Body: `{ "action": "send_invoice", "invoiceNum": "[invoiceNum]" }`
4. If success: send to chatId: `"✅ Invoice #[invoiceNum] sent to [sentTo]"`
5. If failure: send to chatId: `"❌ Invoice #[invoiceNum] failed: [error]"`

---

## Flow: Send Report

**Trigger:** callback_data starts with `sendreport_`

Callback data format: `sendreport_JOBNUM`

1. Parse jobNum from callback data.
2. Answer the callback query.
3. Call Apps Script API via HTTP POST:
   - Body: `{ "action": "send_report", "jobNum": "[jobNum]" }`
4. If success: send to chatId: `"✅ Report for Job #[jobNum] sent to [sentTo]"`
5. If failure: send to chatId: `"❌ Report send failed for Job #[jobNum]: [error]"`

---

## Flow: Report For Job

**Trigger:** callback_data starts with `reportfor_`

Callback data format: `reportfor_JOBNUM`

This fires when Nazish taps one of the "which job?" buttons after uploading a document.

1. Parse jobNum from callback data.
2. Answer the callback query.
3. Read `staticData.pending_report[chatId]` to get `{ fileId, fileName }`.
4. Delete `staticData.pending_report[chatId]`.
5. (Optional) Delete the "Which job is this report for?" message using the Telegram deleteMessage API.
6. Route to **Report Upload Processing** with: chatId, fileId, fileName, jobNum.

---

## Flow: Document Upload

**Trigger:** incoming message has a `document` field.

1. Extract: `fileId = message.document.file_id`, `fileName = message.document.file_name`, `caption = message.caption || ""`

2. **Check caption for a job number:** Try to extract a digit sequence from the caption. If found, go directly to **Report Upload Processing** with: chatId, fileId, fileName, jobNum from caption.

3. **No job number in caption:**
   a. Read Jobs sheet.
   b. Filter to rows where column N (Report Status) is `"Field Work Done"` OR `"Lab Results Pending"` OR `"Writing Report"`.
   c. **If exactly 1 matching job:** go directly to Report Upload Processing with that job's number.
   d. **If multiple matching jobs:**
      - Save to static data: `staticData.pending_report[chatId] = { fileId, fileName }`
      - Build an inline keyboard with one button per waiting job:
        - Label: `"#[jobNum] - [address]"` (trim to ~40 chars if needed)
        - callback_data: `"reportfor_[jobNum]"`
      - Send to chatId with Markdown parse mode:
        ```
        Which job is this report for?
        ```
        Include the inline keyboard.
   e. **If no matching jobs:**
      - Save to static data: `staticData.pending_report[chatId] = { fileId, fileName }`, `staticData.awaiting_job_number[chatId] = true`
      - Send to chatId: `"No jobs currently waiting for a report. Which job number is this for?"`

---

## Report Upload Processing

This is a sub-flow called from Document Upload, Report For Job, and the Name/Job Number Response handler.

**Inputs:** chatId, telegramFileId, fileName, jobNum

**Steps:**

1. **Get Telegram file path:**
   Make an HTTP GET to `https://api.telegram.org/bot[TOKEN]/getFile?file_id=[telegramFileId]`
   Parse the response to get `file_path`.

2. **Download the file:**
   HTTP GET to `https://api.telegram.org/file/bot[TOKEN]/[file_path]`
   This returns the binary file content.

3. **Upload to Google Drive:**
   Use the Google Drive node with "Avi's Google Sheets" (or a separate Google Drive credential if configured). Upload the binary file:
   - Folder: "LPT Reports" (create if it doesn't exist, or use a known folder ID configured as a variable)
   - File name: `"Report-Job-[jobNum]-[fileName]"`
   - Returns the Drive file ID.

4. **Update Jobs sheet:**
   Write the Drive file ID to column O (Report File) of the job row.

5. **Send confirmation to uploader:**
   Send to chatId: `"Report saved for Job #[jobNum]. ✅"`

6. **Send to Avi (6431723336) with the PDF attached:**
   First, download the file from Drive (or use the binary content still in memory from step 2). Then send via Telegram as a document message to Avi, with:
   - Caption (Markdown parse mode):
     ```
     📋 *Report for Job #[jobNum]*
     🏢 [client from Jobs sheet]
     📍 [address from Jobs sheet]

     Tap below to approve and email to the client:
     ```
   - Inline keyboard button:
     - Label: `"✅ APPROVE & SEND REPORT"`
     - callback_data: `"sendreport_[jobNum]"`

   Note: to send a file with inline buttons via Telegram, use the `sendDocument` method with `reply_markup` containing the inline keyboard. The n8n Telegram node may require using the HTTP Request node with the Telegram API directly for this.

---

## Implementation Notes

- Store `APPS_SCRIPT_URL` as a variable at the top of the first Code node in the workflow, or as an n8n environment variable. It needs to be updated after each Apps Script deployment.
- Store `BOT_TOKEN` similarly for the getFile/download API calls.
- All state reads/writes use `$getWorkflowStaticData('global')` in Code nodes. This persists across executions within the same workflow instance.
- When Avi's and Nazish's Telegram IDs are the same (6431723336), there's no need to branch — just send once to that ID.
- Use Markdown parse mode on messages with bold/italic formatting. On messages with no formatting, plain mode is fine.
- The "answer callback query" step (acknowledging button taps) should happen early in each callback flow — before any async operations — so Telegram doesn't show a loading state to the user.
