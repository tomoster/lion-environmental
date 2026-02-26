---
name: project-research
description: Use when dispatched to research a project overnight. Searches for relevant developments, evaluates findings, and writes organized knowledge files with source tracking.
---

# Project Research

Search for relevant developments in this project's domain, evaluate what's useful, and write findings into `knowledge/` with proper organization and source tracking.

---

## Step 1: Read Existing Knowledge

Before searching anything:

1. Run `ls knowledge/` — understand what topics are already covered
2. Read `knowledge/_sources.md` — note every URL already logged. **Do not re-ingest anything already in this list.**
3. Check the most recent dated file to understand what was covered last time

If `knowledge/` doesn't exist, create it:
```bash
mkdir -p knowledge
```

---

## Step 2: Pick a Topic

Choose what to research based on:
1. What's most stale (hasn't been updated recently)
2. What's most relevant to the project's current focus (check CLAUDE.md or README)
3. Gaps in existing coverage

Pick ONE focused topic per session. Depth over breadth.

---

## Step 3: Search — Fresh Content Only

**Everything you find must be from the last 24 hours.** This runs daily — "recent" means today. Discard anything older unless it's a seminal reference that doesn't exist in the KB yet.

### Primary: Hit known high-signal sources directly

Check these first — they're curated, update daily, and don't require filtering noise:

**AI & Tooling (use for KB, WeatherClaw, OpenClaw research):**
- https://simonwillison.net — daily AI tool coverage, highly reliable
- https://huggingface.co/papers — latest ML papers
- https://www.anthropic.com/news — Claude/API updates
- https://openai.com/news — GPT/API updates
- https://news.ycombinator.com — filter for AI/dev topics
- https://github.com/trending — what's shipping right now

**Markets & Trading (use for WeatherClaw, land-flipping research):**
- https://kalshi.com/news — platform updates
- https://polymarket.com — market activity
- County appraisal district websites (for land flipping)

**Regulatory (use for lion-environmental research):**
- https://www.epa.gov/newsreleases — EPA press releases
- NYC DEP and DOB announcement feeds

### Secondary: Web search with freshness filter

Only if the known sources didn't cover the topic. Use `freshness=pd` (past day) in any Brave search query. Without a freshness filter, search results skew toward evergreen content published months ago.

### Evaluate every source
- Published today or yesterday? If not, skip unless it's genuinely foundational.
- Credible author/outlet?
- New information, or rehash of something already in the KB?
- Actionable for this project?

---

## Step 4: Write Findings

Create a markdown file in `knowledge/`:

**Naming:** `knowledge/YYYY-MM-DD-{topic-slug}.md`

**Structure:**
```markdown
# {Topic Title}

**Date:** YYYY-MM-DD
**Sources:** {list URLs}

## Key Findings

{Bullet points — what's new, what changed, what matters}

## Implications

{1-2 sentences on what this means for the project}

## Raw Notes

{Any additional detail worth keeping}
```

If nothing genuinely new was found today — write a brief "nothing new" note in the file anyway. Don't skip the commit. The log of "checked and found nothing" is itself useful.

---

## Step 5: Update Sources Log

Append to `knowledge/_sources.md` (create if it doesn't exist):

```markdown
| Date | Topic | Sources | Files |
|------|-------|---------|-------|
| YYYY-MM-DD | {topic} | {URLs} | {filename} |
```

---

## Step 6: Commit

```bash
git add knowledge/
git commit -m "research: {topic one-liner}"
```

---

## Rules

1. **Last 24 hours only.** This runs daily — stale content doesn't belong here.
2. **Check _sources.md first.** Never re-ingest a URL already logged.
3. **Hit known sources before broad search.** Curated feeds beat search rankings for freshness.
4. **One topic per session.** Don't try to cover everything.
5. **Sources are mandatory.** Every finding must have a URL.
6. **Nothing new is still a valid result.** Write the "nothing found" note and commit.
7. **No code changes.** Research sessions only touch knowledge/ files.
