# Grok Bot notes for token-compression

> **Switch check first:** read `../COMPRESSION-SWITCH.md`. If STATE is OFF, don't use this skill. If ON, use it as described below.

These notes are added by the team (2026-11-23). The upstream files are left unchanged.

## Why it was installed (overlap check)
- **caveman**: terse style for agent messages.
- **response-compression**: concise prose for user- and owner-facing replies.
- **session-compression**: compacting conversation history.
- **capture**: organizing brain dumps.
- **token-compression** (this one) is different. It compresses prompt, skill, and config *files* into a DSL (`{a,b}` packing, `Key=Value{Cond}`, `A→B` routing and state loops). None of the four above does that, so there's no overlap.

## What applies to Grok bots
- Compact briefs for cloud agents and teammates. Examples: `ROUTE:` and `HANDOFF:` maps, `REDFLAGS:` lists, phase loops.
- Product work, when OmniRoute-UX needs lean system prompts. One example is the opt-in local Qwen3-0.6B guide prompt (keep it small). Measure the token change instead of quoting upstream's 40-70%.
- The decompose-first rule: a slim SKILL.md plus `references/`.

## What doesn't apply, or needs care
- Don't rewrite shared skill files, Cursor-managed skills, or upstream SKILL.md files in place. Compress only new or team-owned files, with the owner's OK.
- Never compress safety rules, approval and send rules, exact errors, IDs, SHAs, or owner decisions. Keep them in prose.
- Don't use it for user-facing text (Grok bots reply in plain prose), and don't use it for code or config that people read verbatim.
- `references/iknowkungfu-submission-workflow.md` covers forking and opening PRs on a third-party repo with `gh` and PATs. It's not for us. Never submit, fork, or open PRs outside EoUReDIt/OmniRoute-UX.
- The `hermes` related skills (skill-compression, tier-1-2-3-skill-system, soul authoring) are another harness's skills and aren't installed here.
- There are no scripts. Run nothing.
