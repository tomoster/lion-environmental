# WF7: Avi LPT — Monthly Lead Scrape

This spec is part of the Avi LPT n8n migration. See `00-shared-context.md` for sheet structure, config values, API contract, and credential names.

---

## Overview

**Workflow name:** Avi LPT — Monthly Lead Scrape
**Trigger:** Schedule — 1st of every month at 9:00 AM ET
**Credentials:** Avi's Google Sheets, Avi's Gmail, Lion Environmental Bot, Apify API Token, OpenRouter API
**Existing baseline:** `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-leads/workflow.json` (functional — has: schedule trigger, Apify scrape, transform, basic dedupe by phone/name, filter against existing sheet, append to sheet, email notification)

This workflow scrapes new property management company leads monthly and imports them into the Prospects sheet. Three enhancements are added over the existing baseline:
1. LLM-powered fuzzy company name deduplication (after basic dedup passes)
2. Auto-enrollment of new leads with emails into the cold email sequence
3. Telegram notification to Avi in addition to the existing email notification

---

## Trigger

Schedule node, cron expression: `0 9 1 * *`, timezone: `America/New_York`
(Fires at 9:00 AM ET on the 1st of every month.)

---

## Step 1: Run Apify Scrape

The existing workflow already handles this. Use the Apify API to run the lead scraper actor. The Apify actor for this project scrapes property management companies (likely from Google Maps or a directory).

- Use the "Apify API Token" credential
- Wait for the run to complete and retrieve results
- Expected output: array of company records with fields like: company name, phone, email (may be empty), address, contact name, source

The existing `workflow.json` has the correct actor ID and input configuration — reuse those.

---

## Step 2: Transform Raw Results

The existing workflow handles this. Normalize each scraped record to match the Prospects sheet column structure:
- A: Company name (trim whitespace)
- B: Contact Name (may be empty)
- C: Phone (normalize format if possible)
- D: Email (lowercase, trim)
- E: Building Address
- F: Status → set to `"New"`
- G: Next Follow-up → leave empty
- H: Date Added → today's date
- I: Source → `"Apify"` or the specific actor name

---

## Step 3: Basic Deduplication (existing)

The existing workflow already does this. Deduplicate the scraped batch against itself and against the existing sheet:
- Remove records from the batch where the phone number already appears in the Prospects sheet (column C)
- Remove records where the contact name already appears (column B)
- Remove within-batch duplicates by the same criteria

After this step, only "probably new" leads remain. The existing workflow handles this — preserve it as-is.

---

## Step 4: LLM Fuzzy Company Name Deduplication (new enhancement)

This runs AFTER basic dedup, on the leads that survived step 3. It catches duplicates that slipped through because the company name is spelled slightly differently.

**Read existing company names from Prospects sheet** (column A, all rows). Build a list.

**For each surviving new lead:**

1. If the existing company list is empty: skip LLM check, the lead is new.
2. Call OpenRouter LLM via HTTP POST to `https://openrouter.ai/api/v1/chat/completions`:
   - Model: `anthropic/claude-3.5-haiku`
   - Max tokens: 60
   - System message:
     ```
     You match company names. The user gives a new company name and a list of existing companies. Determine if the new company matches any existing one — they may differ in abbreviations (LLC, Inc, Corp), formatting, minor wording (Property Management vs Prop Mgmt vs Properties), or punctuation. Return ONLY the exact matching company name from the list, or 'none' if no match. No explanation.
     ```
   - User message:
     ```
     New company: '[lead.company]'

     Existing companies:
     [list of existing company names, one per line — limit to first 200 names if the list is very long]
     ```
3. Parse the response. Trim whitespace.
4. If the result is NOT `"none"` (i.e., the LLM found a match): discard this lead (it's a duplicate of an existing prospect).
5. If the result IS `"none"`: keep the lead — it's genuinely new.

**Cost management note:** Only call the LLM for leads that PASSED the basic dedup. This keeps LLM calls low. If there are more than 50 leads to check, that's fine — Haiku is fast and cheap.

After this step, `newLeads` = array of leads confirmed as new.

---

## Step 5: Append New Leads to Prospects Sheet

Append all `newLeads` records to the Prospects sheet as new rows (after the last existing row).

For columns J, K, L (Seq Status, Seq Step, Next Send):
- For leads WITH an email address: set these in step 6 (auto-enroll). Don't set them here.
- For leads WITHOUT an email: leave columns J, K, L empty.

Do a single batch append if possible (one API call for all rows).

Track after append:
- `totalAdded` = count of rows appended
- `withEmail` = count of those rows that have a non-empty email address

---

## Step 6: Auto-Enroll Leads With Emails (new enhancement)

For each newly appended lead that has an email address:

1. Calculate the first send time:
   - Start with `now + random(5, 15) minutes` (to stagger sends)
   - Check if the resulting time is within business hours (Monday-Friday, 9 AM - 5 PM ET):
     - If yes: use that time
     - If outside hours OR it's a weekend: set to the next business day at 9:00 AM ET + random 0-60 minutes
   - "Next business day" logic:
     - If today is Friday after 5 PM: next Monday
     - If today is Saturday: next Monday
     - If today is Sunday: next Monday
     - Otherwise: tomorrow

2. Update the Prospects sheet row for this lead:
   - Column J (Seq Status): `"active"`
   - Column K (Seq Step): `1`
   - Column L (Next Send): the calculated first send datetime (ISO string format)

Update each row individually using the row number from the append operation (n8n Google Sheets "append" returns the range or row numbers that were written — use those to know which rows to update).

---

## Step 7: Send Email Notification (existing, preserve)

The existing workflow sends an email via Gmail to lionenvironmentalllc@gmail.com with a summary of the import. Preserve this behavior:

- Subject: `"[Monthly Leads] [count] new prospects imported"`
- Body: summary including total scraped, total after dedup, total added, list of added company names

---

## Step 8: Send Telegram Notification to Avi (new enhancement)

After the import, send Telegram to Avi (6431723336):
```
📥 *New Leads Imported*

[totalAdded] new leads added from Apify
[withEmail] with email (auto-enrolled in sequence)
```

Use Markdown parse mode.

---

## Implementation Notes

- **LLM call volume:** If the Prospects sheet already has 500+ companies, passing all 500 names to the LLM every time is fine — the prompt will be large but Haiku handles it. Cap at 200 existing names if needed, prioritizing the most recently added (last 200 rows).
- **Sequential LLM calls:** Process the fuzzy dedup one lead at a time (not in parallel) to avoid hitting OpenRouter rate limits on rapid-fire calls. A short delay between calls (500ms) may help if rate limits become an issue.
- **Row number tracking for updates:** When appending rows, n8n returns the range that was written (e.g., `"Prospects!A102:L115"`). Parse the start row number from this to know which rows need the Seq Status update in step 6.
- **Idempotency:** If this workflow runs twice in the same month (manually triggered or due to a bug), the dedup in steps 3-4 should prevent duplicates from being added again. The LLM fuzzy match should catch any that slip through the exact-match dedup.
- **Email address validation:** Before auto-enrolling, check that the email contains `@` and a TLD. Skip obviously malformed emails.
- **The existing baseline** at `~/Documents/projects/n8n-workflows/pulse-equities/avi-lpt-leads/workflow.json` covers steps 1-3 and 7. Import that workflow and add steps 4, 6, and 8 as new nodes between and after the existing nodes.
