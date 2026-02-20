# E2E Test Checklist

Manual testing checklist covering the full prospect-to-invoice workflow. Run through this after major changes.

---

## 1. Prospects

- [x] Create a new prospect from the Prospects page
- [x] Fill all fields: company, contact name, phone, email, building address, service interest
- [x] Verify prospect appears in the table with correct data
- [x] Edit a prospect's details and save
- [x] Change prospect status (New -> Called -> Qualified, etc.)
- [x] Delete a prospect

## 2. Prospect to Job Conversion

- [x] From a prospect row, click "Create Job"
- [x] Verify company, email, and building address carry over to the new job form
- [x] Verify prospect_id is linked on the created job

## 3. Job Creation

- [x] Create a new job from the Jobs page
- [x] Select service type: **LPT** — fill units, price/unit, common spaces, price/common space
- [x] Select service type: **Dust Swab** — fill number of wipes
- [x] Select service type: **Both** — verify both LPT and Dust Swab fields appear
- [x] Set scan date, start time — verify estimated end time auto-calculates
- [x] Change service type or units — verify end time recalculates
- [x] Assign a worker from the dropdown
- [x] Save and verify redirect to job detail page

## 4. Job Detail Page

- [ ] Verify all fields display the saved values correctly
- [ ] Edit company, email, address, notes — save and verify changes persist
- [ ] Change start time — save — verify estimated end time recalculates automatically
- [ ] Verify estimated end time field is read-only (not editable)
- [ ] Change service type — save — verify end time and pricing sidebar update
- [ ] Verify pricing sidebar shows correct line items and totals for LPT
- [ ] Verify pricing sidebar shows correct line items and totals for Dust Swab
- [ ] Verify pricing sidebar shows correct line items and totals for Both
- [ ] Verify tax calculation (8.88%)
- [ ] Change assigned worker — save — verify worker updates
- [ ] Verify Job Info sidebar shows correct service type, date, time range, worker

## 5. Dispatch

- [ ] From job detail, click "Dispatch to Workers"
- [ ] Verify dispatch status changes from "Not Dispatched" to "Open"
- [ ] Verify the Dispatch button disappears after dispatching
- [ ] Change dispatch status manually (Open -> Assigned -> Completed)

## 6. Report

- [ ] Upload a report file (PDF or DOCX) on the job detail page
- [ ] Verify file path appears after upload
- [ ] Upload a replacement report — verify path updates
- [ ] Click "Send Report to Client" — verify report status updates
- [ ] Verify Send Report button only appears when a report file exists

## 7. Invoice

- [ ] From job detail, click "Generate Invoice"
- [ ] Verify job data pre-fills on the invoice form (company, address, line items)
- [ ] Verify LPT line items: units x price, common spaces x price
- [ ] Verify Dust Swab line items: site visit, report, wipes
- [ ] Verify subtotal, tax (8.88%), and total calculations
- [ ] Save invoice — verify it appears on the Invoices page
- [ ] Generate PDF — verify it downloads correctly
- [ ] Send invoice to client — verify status changes to "Sent"
- [ ] Mark invoice as paid — verify status changes to "Paid" and date paid is set

## 8. Team (Workers)

- [ ] Navigate to Team page
- [ ] Add a new worker with name, phone, email
- [ ] Verify worker appears in the table
- [ ] Edit worker details — save and verify
- [ ] Deactivate a worker — verify they no longer appear in job assignment dropdowns
- [ ] Verify active workers show in the "Assigned Worker" dropdown on job creation/detail

## 9. Settings

- [ ] Navigate to Settings page
- [ ] Change LPT default price per unit — create a new job and verify it pre-fills
- [ ] Change LPT default price per common space — verify pre-fill
- [ ] Change duration settings (per unit, per common space, dust swab duration)
- [ ] Create a job with start time — verify estimated end time uses the new durations
- [ ] Edit an existing job's start time — save — verify end time uses the new durations

## 10. Worker Availability (Scheduling)

- [ ] Create two jobs on the same date with overlapping times
- [ ] Assign worker A to job 1
- [ ] On job 2, verify worker A shows as unavailable in the dropdown (with conflict reason)
- [ ] Change job 1's time so it no longer overlaps — verify worker A becomes available on job 2
- [ ] Delete job 1 — verify worker A is available on job 2
