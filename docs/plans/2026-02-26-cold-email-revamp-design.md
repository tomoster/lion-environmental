# Cold Email Revamp — 15-Min Cron + Location Templates

## Problem

Current system sends up to 30 emails in a single daily burst at 9 AM ET. Looks like a bot. Also, all templates are NYC-focused (Local Law 31) but we now have Rockland County and NJ/CT leads that need different messaging.

## Design

### 1. Cron Spacing

- External cron via cron-job.org hits `GET /api/cron/cold-emails` every 15 min
- Schedule: `*/15 * * * *` with America/New_York timezone
- Auth: `Authorization: Bearer <CRON_SECRET>` header
- Each run sends **1 email** (30/day across 32 business-hour runs)
- Route keeps weekday + business hours (9am-5pm ET) safety checks
- Remove cold-emails entry from vercel.json (cron-job.org replaces it)

### 2. Follow-Up Priority

Query prospects with `seq_status='active'` AND `next_send <= now`, ordered by:
1. `seq_step DESC` — follow-ups (steps 2-4) before new sends (step 1)
2. `next_send ASC` — oldest scheduled first

Pick 1, send it, done.

### 3. Location-Based Templates

Detect location from `building_address` field on prospect:

| Location match | Template set |
|----------------|-------------|
| Rockland towns: New City, Spring Valley, Monsey, Nyack, Pearl River, Suffern, Nanuet, Haverstraw, Orangeburg, Congers, West Nyack, Pomona, Tappan, Blauvelt, Chestnut Ridge, Airmont | `rockland` |
| Everything else (NYC, NJ, CT, PA, other) | `nyc` |

Settings keys:
- `cold_email_subject_nyc`, `cold_email_subject_rockland`
- `cold_email_step_1_nyc` through `cold_email_step_4_nyc`
- `cold_email_step_1_rockland` through `cold_email_step_4_rockland`
- Existing `cold_email_subject` and `cold_email_step_1`-`4` become the NYC defaults

### 4. Settings UI

Add a location toggle/tab in the email templates section of Settings so Avi can edit NYC and Rockland templates independently.

### 5. What's NOT Changing

- Daily limit: 30 emails/day
- Gmail SMTP via Nodemailer
- 4-step sequence structure
- Step delays (configurable per step)
- Ramping logic (starts low, increases over time)

### 6. Future (Not This Session)

- Email monitoring: bounce tracking, reply detection, open rates
- NJ/CT-specific templates
- A/B testing templates

## Files to Modify

- `src/app/api/cron/cold-emails/route.ts` — send 1/run, priority ordering, location template lookup
- `src/app/(dashboard)/settings/settings-form.tsx` — location toggle for template editing
- `vercel.json` — remove cold-emails cron entry

## Cron-Job.org Setup

- URL: `https://lion-environmental.vercel.app/api/cron/cold-emails`
- Method: GET
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: Every 15 min
- Timezone: America/New_York
- Notifications: ON for failures
