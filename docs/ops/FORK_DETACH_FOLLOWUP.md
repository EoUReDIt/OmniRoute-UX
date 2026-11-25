---
title: "Fork Detach — GitHub Support Follow-up"
---

# Fork detach — GitHub Support follow-up

Owner action. This repository (`EoUReDIt/OmniRoute-UX`) is a deliberate, permanent deviation
from `cheaper-inference/OmniRoute` (see `AGENTS.md` → "Source repository policy"). GitHub still
lists it as a fork in the source's network. The UI option **Settings → Leave fork network** is
unavailable because the repository is larger than 1 GB, so a GitHub Support request is needed.

This PR is a **draft on purpose**: it is the reminder. Close it once the ticket is resolved.

## Checklist

- [ ] Send the message below at <https://support.github.com/contact> (category: repository / fork network).
- [ ] Record the ticket number here: `__________`
- [ ] Answer any follow-up questions from Support.
- [ ] Verify the repository page no longer shows "forked from …".
- [ ] Verify the source's network graph no longer lists this repository.
- [ ] Confirm branch protection and rulesets on `release/v3.8.55` are unchanged after the detach.
- [ ] Update `AGENTS.md` → "Source repository policy" if the wording about the fork relationship changes.
- [ ] Close this PR (do not merge it).

## Message to send

> **Subject:** Request to detach a fork from its fork network (repository larger than 1 GB)
>
> Hello GitHub Support,
>
> I own the repository `EoUReDIt/OmniRoute-UX`, which was created as a fork of
> `cheaper-inference/OmniRoute`. The project has permanently diverged from its source and will
> not send changes to it or take changes from it.
>
> I would like to detach it from the fork network so that it becomes a standalone repository
> with its history, branches, pull requests and settings preserved.
>
> The self-service option ("Leave fork network") is not available to me because the repository
> is larger than 1 GB.
>
> Could you please detach `EoUReDIt/OmniRoute-UX` from the fork network of
> `cheaper-inference/OmniRoute`? I understand this cannot be undone.
>
> Thank you,
> The repository owner
