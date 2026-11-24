# Grok Bot notes for response-compression

> **Switch check first:** read `../COMPRESSION-SWITCH.md`. If STATE is OFF, don't use this skill. If ON, use it as described below.

These notes are added by the team (2026-11-23). The upstream SKILL.md is left unchanged.

## Why it was installed (overlap check)
- **caveman** overlaps on dropping filler, hedging, and pleasantries. But caveman is fragment-style, and the team uses it only for agent-to-agent and project messages.
- **response-compression** keeps full grammar. It adds the hype-word ban, stopping once the answer is delivered (no recaps, no "let me know" closings), and the rule that direct doesn't mean rude. That makes it the right fit for user- and owner-facing replies and pins, where caveman isn't used.
- **session-compression** is about compacting conversation history, not about reply style. No overlap.

## What applies to Grok bots
- The elimination rules, the termination and directness guidelines, and the checklist. Apply them to every user-facing reply and every Owner Updates pin.
- Keep safety warnings, exact errors and numbers, real uncertainty (no guessed ETAs, measured data only), and the one clarifying question when ambiguity affects correctness.

## What doesn't apply, or needs care
- The upstream `description:` frontmatter is truncated ("hype, and unnecessary framing..."), so it may not trigger by itself. Invoke it by name.
- The `conserve:*` and `sanctum:*` integrations are another harness's plugins. They don't exist here.
- The token-savings figures come from upstream and haven't been measured here, so don't quote them as ours.
- Any "Next:" line the owner requires (for example the pin format) stays, because the owner asked for it.
