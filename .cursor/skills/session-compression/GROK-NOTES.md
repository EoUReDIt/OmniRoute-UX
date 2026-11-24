# Grok Bot notes for session-compression

> **Switch check first:** read `../COMPRESSION-SWITCH.md`. If STATE is OFF, don't use this skill. If ON, use it as described below.

These notes are added by the team (2026-11-23). The upstream SKILL.md is left unchanged.

## What doesn't apply to Grok bots
- The LangChain, Anthropic SDK, prompt-cache and vector-store code. Grok bots don't run their own chat loop, and the app already compacts chat history with summaries automatically. Don't run these scripts or install their libraries without the owner's OK.
- Python token counters and threshold monitors. There's no hook into a bot's own context usage.
- Hooks, checkpoint daemons, and persistent DBs. Don't add them.
- Model, price and context-window figures. They're dated (2025, upstream numbers), so don't quote them as current.

## What does apply
- **Keep recent items verbatim and summarize the old ones.** When a thread gets long, keep the latest decisions, IDs, SHAs and URLs exact, and condense the rest.
- **Checkpoint and resume.** Persist durable decisions in agent memory and task bodies, so a fresh session or a resumed cloud agent can pick up from there.
- **Handoff briefs.** Briefs to cloud agents and teammates carry the goal, binding constraints, current state (branch and SHA), open items, and what to report back. Leave out the history.
- **What to preserve.** Never compress away exact errors, code, numbers, owner decisions, or approval status.
- **Hybrid.** Use a summary for the gist, and fetch the transcript when exact wording matters.

## For product work (e.g. OmniRoute-UX)
Use the techniques (summary buffers, progressive thresholds, prompt caching, RAG memory) as design references when a gateway feature needs context management. Treat the code as example code: adapt it, test it, and check upstream docs before shipping.
