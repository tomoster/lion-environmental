# Lead Scraping Guide — Step by Step

## What You Need

- Apify account (https://console.apify.com)
- The actor: **Google Maps Scraper** (`compass/crawler-google-places`)
  - Go to: https://console.apify.com/actors/compass~crawler-google-places

## The 20 Runs

You'll run the scraper 20 times — 4 search terms x 5 boroughs. Each run takes ~5-10 minutes.

### Settings (same for every run)

| Setting | Value |
|---------|-------|
| **Search Terms** | (see table below — one per run) |
| **Location** | (see table below — one per run) |
| **Max places per search** | `500` |
| **Language** | `en` |
| **Country** | `US` |
| **Skip closed places** | Yes |
| **Company contacts enrichment** | **ON** (this is what gets emails!) |

### How to find the settings

1. Open the actor page
2. Click **"Try for free"** or **"Start"**
3. In the input form:
   - **Search Terms** → paste the search term
   - **Location** → type the borough
   - **Max crawled places per search** → set to `500`
   - Scroll down to **"Enrich with company contacts"** → toggle ON
4. Click **Start**
5. Wait for it to finish (~5-10 min)
6. Click **Export results** → choose **CSV**
7. Save the file with a name like `run-01-manhattan-property.csv`

---

## Run Checklist

Do these in order. Check off each one as you finish.

### Manhattan (runs 1-4)

| # | Search Term | Location | File Name | Done? |
|---|------------|----------|-----------|-------|
| 1 | `property management company` | `Manhattan, New York, NY` | `run-01.csv` | [ ] |
| 2 | `real estate management` | `Manhattan, New York, NY` | `run-02.csv` | [ ] |
| 3 | `building management company` | `Manhattan, New York, NY` | `run-03.csv` | [ ] |
| 4 | `apartment management` | `Manhattan, New York, NY` | `run-04.csv` | [ ] |

### Brooklyn (runs 5-8)

| # | Search Term | Location | File Name | Done? |
|---|------------|----------|-----------|-------|
| 5 | `property management company` | `Brooklyn, New York, NY` | `run-05.csv` | [ ] |
| 6 | `real estate management` | `Brooklyn, New York, NY` | `run-06.csv` | [ ] |
| 7 | `building management company` | `Brooklyn, New York, NY` | `run-07.csv` | [ ] |
| 8 | `apartment management` | `Brooklyn, New York, NY` | `run-08.csv` | [ ] |

### Queens (runs 9-12)

| # | Search Term | Location | File Name | Done? |
|---|------------|----------|-----------|-------|
| 9 | `property management company` | `Queens, New York, NY` | `run-09.csv` | [ ] |
| 10 | `real estate management` | `Queens, New York, NY` | `run-10.csv` | [ ] |
| 11 | `building management company` | `Queens, New York, NY` | `run-11.csv` | [ ] |
| 12 | `apartment management` | `Queens, New York, NY` | `run-12.csv` | [ ] |

### Bronx (runs 13-16)

| # | Search Term | Location | File Name | Done? |
|---|------------|----------|-----------|-------|
| 13 | `property management company` | `Bronx, New York, NY` | `run-13.csv` | [ ] |
| 14 | `real estate management` | `Bronx, New York, NY` | `run-14.csv` | [ ] |
| 15 | `building management company` | `Bronx, New York, NY` | `run-15.csv` | [ ] |
| 16 | `apartment management` | `Bronx, New York, NY` | `run-16.csv` | [ ] |

### Staten Island (runs 17-20)

| # | Search Term | Location | File Name | Done? |
|---|------------|----------|-----------|-------|
| 17 | `property management company` | `Staten Island, New York, NY` | `run-17.csv` | [ ] |
| 18 | `real estate management` | `Staten Island, New York, NY` | `run-18.csv` | [ ] |
| 19 | `building management company` | `Staten Island, New York, NY` | `run-19.csv` | [ ] |
| 20 | `apartment management` | `Staten Island, New York, NY` | `run-20.csv` | [ ] |

---

## After All 20 Runs

### Option A: Import one at a time (easiest)

Just go to your app at `/prospects/import` and upload each CSV file one at a time. The dedup will prevent duplicates across uploads automatically.

### Option B: Merge first, then import once

1. Put all 20 CSV files in one folder (e.g., `~/Downloads/apify-leads/`)
2. Run the merge script (see below)
3. Upload the single merged file to `/prospects/import`

#### Merge script

Open Terminal and run:

```bash
cd ~/Downloads/apify-leads
head -1 run-01.csv > all-leads.csv
for f in run-*.csv; do tail -n +2 "$f" >> all-leads.csv; done
echo "Merged into all-leads.csv"
wc -l all-leads.csv
```

This takes the header from the first file, then appends all data rows from every file. The import page handles dedup, so duplicates across runs are fine.

---

## Test Run First

Before doing all 20, do a single test run to verify company contacts enrichment works:

1. Run #1 (Manhattan, property management company) but set max to `10` instead of 500
2. Export CSV
3. Open it — check if the `email` column has data
4. If yes, emails are working — proceed with all 20 at max 500
5. Upload the test CSV to `/prospects/import` to verify the import works too

---

## Cost Estimate

Google Maps Scraper costs ~$2-5 per 1,000 results with company contacts enrichment enabled. At 500 max per run x 20 runs = up to 10,000 results. Expect $20-50 total Apify cost, but actual results will be less since not every search returns 500.

---

## What the Import Does

When you upload a CSV to `/prospects/import`:

1. Parses the CSV and maps Apify columns to your database
2. Shows you a preview with stats (total rows, % with email, % with phone)
3. Checks for duplicates against existing prospects (by company name, phone, or email)
4. Also deduplicates within the upload itself
5. Inserts new leads with status "New" and source "apify"
6. Shows results: how many imported, how many skipped as duplicates
