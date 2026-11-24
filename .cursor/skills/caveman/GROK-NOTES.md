# Grok Bot notes for caveman

> **Switch check first:** read `../COMPRESSION-SWITCH.md`. If STATE is OFF, don't use this skill. If ON, use it as described below.

These notes are added by the team (2026-11-23). The upstream SKILL.md is left unchanged.

- **Applies to:** terse agent-to-agent messages, project messages, and cloud-agent briefs.
- **Doesn't apply to:** user- or owner-facing replies (use response-compression there), security warnings, approval requests, or exact errors, IDs and SHAs.
- **Off-switch mapping:** the upstream "stop caveman" / "normal mode" also maps to the shared switch above.
- The scripts in `scripts/` aren't run without the owner's OK.
