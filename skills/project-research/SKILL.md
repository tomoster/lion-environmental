---
name: project-research
description: Use when dispatched to research a project overnight. Searches for relevant developments, evaluates findings, and writes organized knowledge files with source tracking.
---

# Project Research

Search for relevant developments in this project's domain, evaluate what's useful, and write findings into `knowledge/` with proper organization and source tracking.

---

## Step 1: Read Existing Knowledge

Before searching anything:

```bash
ls knowledge/
```

Read the most recent files to understand what's already known. Do not duplicate existing content.

If `knowledge/` doesn't exist, create it:
```bash
mkdir -p knowledge
```

---

## Step 2: Pick a Topic

Choose what to research based on:
1. What's most stale (hasn't been updated recently)
2. What's most relevant to the project's current focus (check CLAUDE.md or README)
3. What's changed in the outside world since the last research

Pick ONE focused topic per session. Depth over breadth.

---

## Step 3: Search

Run 3-5 web searches on the chosen topic. Look for:
- News and developments from the last 7 days
- New tools, platforms, or data sources
- Regulatory or market changes
- Competitor activity or industry shifts
- Emerging patterns or trends

Evaluate every source:
- Who wrote it? Are they credible?
- When was it published? Is it current?
- Is this new information or rehashed content?
- Is it actionable for this project?

Discard anything that's noise, outdated, or not actionable.

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

---

## Step 5: Update Sources Log

If `knowledge/_sources.md` exists, append to it. If not, create it.

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

1. **One topic per session.** Don't try to cover everything.
2. **Read before you write.** Never duplicate what's already in knowledge/.
3. **Sources are mandatory.** Every finding must have a URL.
4. **Discard noise.** If it's not new, actionable, or relevant — skip it.
5. **No code changes.** Research sessions only touch knowledge/ files.
6. **Create knowledge/ if it doesn't exist.** First run bootstraps the folder.
