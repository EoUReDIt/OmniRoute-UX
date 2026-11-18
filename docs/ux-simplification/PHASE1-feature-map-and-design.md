# Phase 1 — feature map and Simple Mode design

This note is investigation and design only. It does not change the gateway, the dashboard, or any default. Nothing proposed below exists as a setting, flag, or route until a later phase implements it.

The product goal is a simpler surface for people who are new to AI gateways, with a clear switch back to the current UI. Core behavior stays. Screens may be tucked away in the simple surface, and every one of them stays reachable and works the same way in the full surface. An optional local model under one billion parameters may help later. It stays off unless the operator turns it on, and while it is off it does not run and does not change routing.

Research date for the model section: 2026-11-18. Counts below are observations on this branch, not release-managed totals. The live catalog is the source file named next to each claim.

## 1. How the app is built and served

OmniRoute is one Next.js App Router process. The dashboard, the HTTP API, and the MCP HTTP transports are the same server. The default port is 20128.

| Shell             | What the user actually gets                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web dashboard     | Next.js 16.4.2, React 19.2.8, Tailwind 4, `next-intl`, Zustand. Pages live under `src/app`. The signed-in shell is `src/app/(dashboard)/layout.tsx`, which renders `DashboardLayout` → sidebar, header, breadcrumbs, command palette.                             |
| Desktop           | `electron/main.js` starts the bundled Next standalone server and loads the same dashboard in a `BrowserWindow`. There is no second UI. Electron adds tray, autostart, and update chrome on the existing Home and Appearance screens.                              |
| PWA               | `src/app/manifest.ts` (`start_url` `/dashboard`, `display: standalone`). `public/sw.js` caches an app shell and skips `/api/`, `/dashboard`, and `/v1`. `src/app/offline/page.tsx` is the offline fallback. A theme change does not require a separate PWA build. |
| Telegram mini app | `/miniapp` is a separate small chat page posting to the Telegram update route. It is not part of the dashboard shell.                                                                                                                                             |
| In-app docs       | fumadocs compiles the globs in `source.config.ts`. This folder is outside those globs, so this note does not appear in `/docs` until someone adds it there on purpose.                                                                                            |

UI copy is English in `src/i18n/messages/en.json`, with locale files generated from that source. Shared controls come from `packages/ui-kit` (`@omniroute/ui-kit`) and adapters in `src/shared/components`.

The instance is single-operator. One management password (or OIDC) guards the dashboard. Many client API keys exist; they are credentials for callers, not human accounts. Dashboard preferences stored in SQLite are global to the instance.

## 2. UI map

Navigation is the catalog in `src/shared/constants/sidebarVisibility/sections.ts` (`SIDEBAR_SECTIONS`), rendered by `src/shared/components/Sidebar.tsx`. There are ten sections: Home, OmniProxy, Analytics, Costs, Monitoring, Dev Tools, Agentic Features, Other Features, Configuration, Help. Items and whole sections can be hidden or reordered from Settings → Sidebar. Two items cannot be hidden: `proxy` and `settings-sidebar` (`PROTECTED_SIDEBAR_ITEM_IDS` in `src/shared/constants/sidebarVisibility.ts`).

This branch has 151 `page.tsx` files under `src/app`. The appendix lists every route. The groups below are the ones a novice design has to account for.

### 2.1 Public and account screens

| Route                                                                     | Role                                                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                       | If the query carries a Zed `user_id` and `access_token`, redirects to `/callback`. Otherwise redirects to `/dashboard`. |
| `/dashboard`                                                              | Redirects to `/home`.                                                                                                   |
| `/login`, `/forgot-password`                                              | Management sign-in and password recovery. Login can send a password-less install to onboarding.                         |
| `/landing`                                                                | Marketing page.                                                                                                         |
| `/docs`, `/docs/api-explorer`, `/docs/[...slug]`                          | In-app documentation.                                                                                                   |
| `/privacy`, `/terms`, `/status`, `/maintenance`, `/offline`, `/forbidden` | Legal, status, maintenance, PWA offline, 403.                                                                           |
| `/400` `/401` `/403` `/408` `/429` `/500` `/502` `/503`                   | HTTP error pages.                                                                                                       |
| `/callback`, `/auth/callback`                                             | OAuth and native-app token relay.                                                                                       |
| `/connect/codex/[token]`                                                  | Codex connect handoff.                                                                                                  |
| `/miniapp`                                                                | Telegram mini app.                                                                                                      |

### 2.2 First run

`/dashboard/onboarding` is the wizard. Step ids in `src/app/(dashboard)/dashboard/onboarding/page.tsx` are `welcome`, `tiers`, `security`, `provider`, `test`, `done`. Finishing writes `setupComplete: true` through `PATCH /api/settings`. If `setupComplete` is already set, the page leaves for the dashboard. Home shows a soft readiness card when setup is not complete; dismissing it writes `omniroute-first-run-readiness-dismissed` in `localStorage` and does not force the wizard. `INITIAL_PASSWORD` also marks setup complete on read (`src/lib/db/settings.ts`).

The wizard connects a provider and tests it. It does not create a client API key, open the CLI Code cards, or enable MCP.

### 2.3 Sidebar, by job

**Home** (`/home`). Readiness, quick start, recent requests, provider topology. Electron update controls live here too.

**Get a working endpoint (OmniProxy, top level).**

| Item              | Route                           | Job                                                                                                                                                                             |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoints         | `/dashboard/endpoint`           | Base URL, tunnels, and tabs for APIs, MCP, A2A, and context sources (Notion / Obsidian). The MCP tab embeds the MCP dashboard. The enable switch itself is on `/dashboard/mcp`. |
| API Manager       | `/dashboard/api-manager`        | Client API keys and access policy. Per-key editor: `/dashboard/api-manager/[id]/access`. Per-key routing: `/dashboard/api-manager/routing`.                                     |
| Providers         | `/dashboard/providers`          | Connection catalog. Add flow: `/dashboard/providers/new`. Detail: `/dashboard/providers/[id]`. ChatGPT OAuth finish: `/dashboard/providers/chatgpt/connect`.                    |
| Models & Combos   | `/dashboard/models`             | Model catalog and combo targets.                                                                                                                                                |
| Embedded services | `/dashboard/providers/services` | Installers for local sidecars (Cliproxy, Mux, Bifrost, and the rest of that page).                                                                                              |
| Combos            | `/dashboard/combos`             | Combo definitions. Detail: `/dashboard/combos/[id]`. Playground: `/dashboard/combos/playground`.                                                                                |
| Combo Studio      | `/dashboard/combos/live`        | Live routing cascade.                                                                                                                                                           |
| Provider quota    | `/dashboard/quota`              | Per-connection quota.                                                                                                                                                           |
| Quota share       | `/dashboard/costs/quota-share`  | Quota-share view.                                                                                                                                                               |

**Compression**, grouped under OmniProxy. Global defaults at `/dashboard/context/settings`. Per-combo compression at `/dashboard/context/combos`. One page per engine: caveman, rtk, headroom, session-dedup, ccr, llmlingua, lite, aggressive, ultra, omniglyph. Studio at `/dashboard/compression/studio`. Exclusions at `/dashboard/compression/exclusions`. `/dashboard/context` redirects to a tab sub-route (default `/dashboard/context/settings`). `/dashboard/compression` redirects to `/dashboard/context/caveman`. Caveman and RTK already have a Simple / Advanced control on that page only.

**Coding tools and agents**, grouped under OmniProxy.

| Route                                                 | Job                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/cli-code`, `/dashboard/cli-code/[id]`     | Point a coding tool at this gateway. Cards come from `CLI_TOOLS` in `src/shared/constants/cliTools.ts` (Claude Code, Codex, Cursor, Cline, Continue, Copilot, OpenCode, Aider, Zed, Goose, and the rest of that catalog). |
| `/dashboard/cli-agents`, `/dashboard/cli-agents/[id]` | CLI agent tools.                                                                                                                                                                                                          |
| `/dashboard/acp-agents`                               | ACP agents.                                                                                                                                                                                                               |
| `/dashboard/cloud-agents`                             | Cloud agent registry.                                                                                                                                                                                                     |
| `/dashboard/conductor`                                | CLI-agent fleet.                                                                                                                                                                                                          |
| `/dashboard/orchestration`                            | Multi-agent orchestration.                                                                                                                                                                                                |
| `/dashboard/tools/agent-bridge`                       | Agent bridge. `/dashboard/system/mitm-proxy` shows a moved banner, then goes here.                                                                                                                                        |
| `/dashboard/tools/traffic-inspector`                  | Traffic inspector.                                                                                                                                                                                                        |
| `/dashboard/discovery`                                | Provider and model discovery.                                                                                                                                                                                             |

**Integrations.** `/dashboard/api-endpoints` (route reference), `/dashboard/webhooks`, `/dashboard/log-export`.

**Proxy (always in the sidebar).** `/dashboard/system/proxy` with tabs for global config, proxy pool, free pool, docs, and subscriptions. `/dashboard/system/1proxy` redirects to `?tab=free-pool`. `/dashboard/relay` is a relay client with no sidebar row.

**Analytics.** `/dashboard/analytics` plus combo health, utilization, compression, search, and evals. Also `/dashboard/cache` (response cache) and `/dashboard/provider-stats`.

**Costs.** `/dashboard/costs`, pricing, teams, budget, `/dashboard/free-tiers`, `/dashboard/free-provider-rankings`, `/dashboard/radar` (hidden unless `RADAR_ENABLED`). Radar sub-pages: combos, intel, offers, setup. A private Radar Admin link is injected only when `radarAdminUrl` is a valid authenticated setting (`resolveRuntimeSidebarSections`).

**Monitoring.** `/dashboard/activity`. Logs: `/dashboard/logs`, `/dashboard/logs/proxy`, `/dashboard/logs/console`, `/dashboard/logs/timeline`. `/dashboard/logs/activity` permanently redirects to `/dashboard/activity`. `/dashboard/usage` redirects to `/dashboard/logs`. Conversations: `/dashboard/conversations`. Audit: `/dashboard/audit`, `/dashboard/audit/mcp`, `/dashboard/audit/a2a`. System: `/dashboard/health`, `/dashboard/runtime`, `/dashboard/resilience/connections`, `/dashboard/resilience/cooldowns`.

**Dev tools.** `/dashboard/translator` (format translation; the Translate tab defaults to simple controls). `/dashboard/playground` (chat, compare, API, build). `/dashboard/search-tools`.

**Agentic features.** `/dashboard/memory`, `/dashboard/agent-skills`, `/dashboard/chaos`, `/dashboard/omni-skills`, `/dashboard/mcp`, `/dashboard/a2a`, `/dashboard/plugins` and `/dashboard/plugins/[name]/config`.

**Other.** Leaderboard, profile, tokens, gamification admin. Media cache `/dashboard/cache/media`. Media providers redirect into `/dashboard/media-providers/[kind]`. Batch: `/dashboard/batch`, `/dashboard/batch/files`.

**Configuration (settings).** Each row is its own route. `/dashboard/settings` and `/dashboard/settings?tab=` redirect into these.

| Route                                 | What the operator edits                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/settings/general`         | Storage health, backup, retention, vacuum, log purge, usage reset.                                                                       |
| `/dashboard/settings/appearance`      | Theme, palette, Home widgets, combo builder guided vs expert, quota auto-refresh, tunnel chips, instance name, logo, Electron autostart. |
| `/dashboard/settings/ai`              | Thinking budget, system prompt, Responses state, token buffers, memory and skills toggles, model capability overrides.                   |
| `/dashboard/settings/modality-bridge` | Vision, audio, and video bridge.                                                                                                         |
| `/dashboard/settings/routing`         | Global strategy, quota preflight, auto-routing, aliases, fallback, catalog visibility.                                                   |
| `/dashboard/settings/resilience`      | Provider breaker, connection cooldown, queue, combo cooldown.                                                                            |
| `/dashboard/settings/advanced`        | Debug, payload rules, request limits, headroom proxy.                                                                                    |
| `/dashboard/settings/security`        | Password, require-login, MFA, IP filters, authz, banned keywords, PII card.                                                              |
| `/dashboard/settings/access-tokens`   | Scoped management tokens.                                                                                                                |
| `/dashboard/settings/feature-flags`   | Flag grid.                                                                                                                               |
| `/dashboard/settings/cache`           | Catalog TTL and semantic cache.                                                                                                          |
| `/dashboard/settings/sidebar`         | Presets and per-item visibility. Protected, so it cannot be hidden.                                                                      |
| `/dashboard/settings/pricing`         | Redirects to `/dashboard/costs/pricing`.                                                                                                 |

**Help.** `/docs`, the GitHub issues link, `/dashboard/changelog`.

**Not in the sidebar, still real screens.** `/dashboard/onboarding`, `/dashboard/providers/new`, `/dashboard/combos/[id]`, `/dashboard/compression/live`, `/dashboard/auto-combo` (redirects to `/dashboard/combos?filter=intelligent`), `/dashboard/limits` (redirects to `/dashboard/quota`).

### 2.4 Personalization that already exists

These are easy to confuse with a future Simple view. They are not it.

| Mechanism                                                            | Stored as                                                                                                    | What it changes                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar presets `all`, `essentials`, `minimal`, `developer`, `admin` | `sidebarActivePreset` plus `hiddenSidebarItems` in the settings row                                          | Which sidebar rows render. `essentials` keeps Home, Endpoints, API Manager, Providers, Health, General, and Sidebar. It hides MCP. Command Palette still lists `ESSENTIALS_ADVANCED_TOOL_IDS`. Applying a preset overwrites the hidden-item list. |
| Section and item order, hidden sections, hidden group labels         | settings keys `sidebarSectionOrder`, `sidebarItemOrder`, `hiddenSidebarSections`, `hiddenSidebarGroupLabels` | Layout only.                                                                                                                                                                                                                                      |
| Pinned rows, expanded accordion                                      | `localStorage` keys `sidebar-pinned-items`, `sidebar-expanded-sections`, `sidebar-pinned-sections`           | This browser only.                                                                                                                                                                                                                                |
| Sidebar collapsed                                                    | cookie `ci_sidebar_state`                                                                                    | This browser only.                                                                                                                                                                                                                                |
| Theme and palette                                                    | Zustand persist key `theme`                                                                                  | This browser only.                                                                                                                                                                                                                                |
| Combo builder                                                        | settings `comboConfigMode`, default `guided` (`src/lib/db/settings.ts`)                                      | Combos page only: guided steps vs expert.                                                                                                                                                                                                         |
| Translator simple controls                                           | component state on `/dashboard/translator`                                                                   | That tab only.                                                                                                                                                                                                                                    |
| Caveman / RTK Simple vs Advanced                                     | component state on those context pages                                                                       | Those pages only.                                                                                                                                                                                                                                 |
| UI-kit `RequestWorkbench` variant `onboarding`                       | not imported by any `src/app` page                                                                           | Unused by the dashboard today.                                                                                                                                                                                                                    |

Cross-tab settings refresh uses the event `omniroute:settings-updated`.

**Why the essentials preset is not the Simple view.** It writes the same hidden-item list a power user uses, so switching "back" cannot restore a custom layout. It hides MCP, which is part of the novice path. It does not simplify the pages themselves: Providers, API Manager, and Endpoints still render the full screens. A Simple view has to be a separate shell.

## 3. Settings storage and feature flags

System settings are rows in the SQLite `key_value` table, namespace `settings`, read and written by `getSettings` / `updateSettings` in `src/lib/db/settings.ts`. The dashboard uses `GET` and `PATCH` on `/api/settings`.

Feature-flag overrides use namespace `feature_flags` (`src/lib/db/featureFlags.ts`). Definitions live in `src/shared/constants/featureFlagDefinitions.ts` and the sibling modules it spreads (search, System One, fal, code-assist, PII vault). On this branch those modules declare 126 `key` entries. Categories are `security`, `network`, `policies`, `runtime`, `cli`, and `health`. Resolution order is database override, then environment, then `defaultValue` (`src/shared/utils/featureFlags.ts`). Security-category flags, including `OMNIROUTE_MCP_ENFORCE_SCOPES`, need a stronger operator proof to write while login is on.

Two flags must stay default `"false"` (Hard Rule 20, guarded by `tests/unit/pii-opt-in-default.test.ts`): `PII_REDACTION_ENABLED` and `PII_RESPONSE_SANITIZATION`. A Simple view must not flip them.

`mcpEnabled` defaults to false. `mcpTransport` falls back to `stdio` when unset.

## 4. Gateway path, and where time actually goes

A client calls `/v1/chat/completions` with its OmniRoute API key. The route is `src/app/api/v1/chat/completions/route.ts`. The handler is `handleChat` in `src/sse/handlers/chat.ts`. The upstream call is `handleChatCore` in `open-sse/handlers/chatCore.ts`.

Ordered stages on a normal chat request, with the cost class the code implies (no timings were measured for this note):

1. **Process init and auth.** Translator init once per process. Client key check (`extractApiKey` / `isValidApiKey` in `src/sse/services/auth.ts`): environment key, or a SQLite lookup. Optional API-key policy after that (allowlist, budget, rate limit). Rate limits are empty by default, so there is no implicit cap.
2. **Admission and injection guard.** Body size, then a synchronous prompt-injection guard. Failures return before any provider call.
3. **Optional Bifrost sidecar.** Network, only if configured. A failure falls through to the native stack.
4. **Guardrails.** PII redaction only when its flag is on. Task-aware routing (`getTaskRoutingConfig().enabled` in `src/sse/handlers/chat.ts`) runs only when enabled. The default in `open-sse/services/taskAwareRouter.ts` is `enabled: false`, and the classifier is regex, not a model.
5. **Combo resolve.** `getComboForModel` uses a short-lived combos cache. Strategies are the values of `ROUTING_STRATEGY_VALUES` in `src/shared/constants/routingStrategies.ts`, plus the internal `quota-share` strategy that the UI does not offer. `auto` scores candidates in-process with `scorePool` and `DEFAULT_WEIGHTS` in `open-sse/services/autoCombo/scoring.ts`. Intent labels for that score come from `open-sse/services/intentClassifier.ts`, whose file header states the classifier is synchronous, under 1 ms, and does no I/O. It is keywords in nine languages, not a neural model.
6. **Credentials.** `getProviderCredentials` reads cached connection rows and skips cooled-down or locked-out accounts in-process. Quota preflight, when enabled, adds an upstream usage fetch. The comment in `open-sse/services/quotaPreflight.ts` says that fetch adds latency. The preflight switch defaults off.
7. **Gates before the first provider hop.** Provider circuit breaker, connection cooldown, and model lockout. See `docs/architecture/RESILIENCE_GUIDE.md`. These reads are in-process or SQLite. They exist to avoid a call that would fail.
8. **Inside `handleChatCore`, still before the provider.** Idempotency cache (can return the stored response). Optional Copilot `github/auto` resolution (network, cached per account and conversation). Memory and skills injection when those features are on. Compression (`applyCompressionAsync`). Exact semantic-cache lookup (can skip the provider). Translation. Token and TPM guards.
9. **Provider HTTP or SSE.** This is the hop the user is waiting on. Combo fallback, account fallback, and breaker updates run after a failure, and each extra attempt pays another provider hop. Fusion fans out to a panel plus a judge (`open-sse/services/fusion.ts` sets a straggler grace of 8000 ms and a panel hard timeout of 90000 ms).

Caches that already skip work: idempotency, the exact semantic cache, the 10-second combos cache, auto latency stats, quota snapshots, and the Copilot auto decision cache. The vector semantic cache is a second layer, default off, because turning it on calls an embedding endpoint on cacheable requests (`open-sse/config/semanticCacheConfig.ts`, `embeddingTimeoutMs` default 3000, default embedding model `text-embedding-3-small`). Enabling it to "go faster" adds a hop on misses.

### 4.1 Small models that already exist, and what they cost

| Hook                      | On the chat path?                    | Default                                                  | Effect on latency                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyword intent classifier | Only for `auto` combos               | Always, and it is not a model                            | Negligible. Documented as under 1 ms, no I/O.                                                                                                                                                                                                                            |
| Task-aware router         | Only if the operator enables it      | Off                                                      | In-process regex.                                                                                                                                                                                                                                                        |
| `jev` combo strategy      | Only if `COMBO_JEV_STRATEGY_ENABLED` | `"false"`                                                | When on, each routed request calls TypeSafe (`api.typesafe.ai`) before the attempt. That is an extra network hop. Off means `jev` keeps the operator's order and makes no TypeSafe call.                                                                                 |
| `POST /v1/systemone`      | Separate route, not chat             | `SYSTEMONE_OLLAMA_LOCAL_BACKEND_ENABLED` is `"false"`    | When the Ollama flag is on, that route may call the `ollama-local` connection (default base `http://localhost:11434/v1` from `src/shared/constants/providers/local.ts`). It does not sit in front of `/v1/chat/completions`.                                             |
| Compression ultra + SLM   | Only when ultra SLM is configured    | Heuristic ultra; `ultraEngine` defaults to `"heuristic"` | Local inference on the request, fail-open to the heuristic. This spends latency to save tokens. The proven ONNX models in `open-sse/services/compression/engines/llmlingua/constants.ts` are TinyBERT (57 MB) and BERT-base (710 MB) for token pruning, not chat models. |
| Vector semantic cache     | Only when opted in                   | Off                                                      | Embedding hop, timeout 3000 ms.                                                                                                                                                                                                                                          |

`onnxruntime-node` is already a dependency for that compression worker. It is not a chat runtime.

Local chat providers the operator can already connect, all OpenAI-compatible base URLs, none of them started by the gateway itself (`src/shared/constants/providers/local.ts`):

| Id                    | Default base URL                                            |
| --------------------- | ----------------------------------------------------------- |
| `ollama-local`        | `http://localhost:11434/v1`                                 |
| `lm-studio`           | `http://localhost:1234/v1`                                  |
| `llama-cpp`           | `http://127.0.0.1:8080/v1`                                  |
| `llamafile`           | `http://127.0.0.1:8080/v1` (same default port as llama.cpp) |
| `vllm`                | `http://localhost:8000/v1`                                  |
| `lemonade`            | `http://localhost:13305/api/v1`                             |
| `docker-model-runner` | `http://localhost:12434/engines/v1`                         |

There is no in-app "pull model" call. The provider form stores a base URL. The operator starts Ollama, LM Studio, or llama-server outside the app.

## 5. MCP setup as it exists today

OmniRoute **is** an MCP server. It does not have a screen for attaching arbitrary remote MCP servers. Context sources on the endpoint page are Notion and Obsidian cards, not a general MCP client registry.

Operator steps, all current product behavior:

1. Open `/dashboard/mcp`. The page is outside the essentials preset, so a beginner preset hides it. The endpoint page has an MCP tab, but the enable switch is on `/dashboard/mcp`.
2. Turn MCP on. The switch `PATCH`es `/api/settings` with `mcpEnabled`. Default is false. The SSE route's error text still says to enable MCP from the Endpoints page; the control is on `/dashboard/mcp`.
3. Pick a transport. `stdio` shows the command `omniroute --mcp` (`bin/omniroute.mjs` checks `--mcp`). `sse` shows `{base}/api/mcp/sse`. `streamable-http` shows `{base}/api/mcp/stream`. HTTP transports return 503 until MCP is on and the transport matches.
4. Point the coding tool at that command or URL, with a Bearer API key for non-loopback HTTP. Scopes on the key are enforced only when `OMNIROUTE_MCP_ENFORCE_SCOPES` is on (default off).
5. The dashboard then lists the static tool catalog from `GET /api/mcp/tools` and audit from `GET /api/mcp/audit`. Operational buttons on that dashboard can activate a combo, apply a resilience preset, or reset a breaker. Those call existing APIs. They are not required to connect a client.

There is no MCP wizard. The page shows three short steps (`mcpStep1`–`mcpStep3` in `src/i18n/messages/en.json`): run the command, configure the client for stdio, invoke tools. Adding a tool is a code change under `open-sse/mcp-server/tools/`, not a dashboard form.

Client snippets for coding tools already live on `/dashboard/cli-code`. That page is the right place to "plug into Cursor / Claude Code / Codex". MCP setup should hand the user back to those cards, not invent a second snippet generator with different flags.

## 6. Simple view design

### 6.1 Principle

Simple view is a shell and a checklist. It composes existing pages and existing `PATCH /api/settings` writes. It does not fork provider connect, key creation, combo evaluation, or MCP enablement.

Full view is today's shell. With the mode unset or set to original, every current screen and every request path behaves as it does on this branch. The one addition on those screens is the switch itself, so the operator can leave. Gateway responses do not depend on the view mode. Handlers do not read it.

### 6.2 The switch

Persist one settings field on the existing settings row, through `PATCH /api/settings`:

```text
dashboardUiMode: "original" | "simple"
```

Default in the settings merge: `"original"`. A missing key means original, so every database that exists today stays on the current UI with no migration that flips anyone.

|                |                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Where it sits  | The dashboard header, in both shells, always visible. Same control on the simple Home checklist and on Settings → Appearance, so it is not only in a menu the novice has not found.                                |
| What it writes | Only `dashboardUiMode`. It must not write `hiddenSidebarItems`, `sidebarActivePreset`, `hiddenSidebarSections`, or `sidebarItemOrder`.                                                                             |
| How it updates | Optimistic label change, revert if the PATCH fails. Other tabs hear `omniroute:settings-updated`, which the sidebar already uses.                                                                                  |
| Server render  | A cookie mirroring the last successful value lets the layout pick a shell without a flash. If the cookie and the database disagree, the database wins and the cookie is rewritten. Absence of both means original. |
| Shells         | Web, PWA, and Electron share this SQLite row, so the switch follows the instance, not one browser profile.                                                                                                         |
| Deep links     | No middleware blocks routes. `/dashboard/combos` while simple still renders the existing combo page, with the header switch still on screen.                                                                       |

Full view keeps the sidebar presets, including essentials. They remain a power-user layout tool.

### 6.3 What simple view shows

A short nav, in this order. Each item mounts the existing page, not a copy of its logic.

| Nav label   | Existing route                                                            | What the novice sees                                                                                                                   | Tucked behind a disclosure on that same page                                                                  |
| ----------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Home        | `/home`                                                                   | Checklist: endpoint URL with copy, whether a provider is connected, whether a client key exists, links to the next row. Header switch. | Topology, advanced metrics, Electron update details.                                                          |
| Providers   | `/dashboard/providers` and the existing `/dashboard/providers/new` wizard | Connect one provider.                                                                                                                  | Bulk add, embedded services, per-provider power panels.                                                       |
| API keys    | `/dashboard/api-manager`                                                  | Create one key, copy it once, show the base URL to paste.                                                                              | Per-key routing, budgets, scope matrices. Reachable from the key's existing access route, and from Full view. |
| Coding tool | `/dashboard/cli-code`                                                     | Five starter cards: Claude Code, Codex, Cursor, Cline, Continue. Each card is the existing card.                                       | "Show every tool" expands the rest of `CLI_TOOLS` on the same page.                                           |
| MCP         | `/dashboard/mcp`                                                          | Enable switch, transport picker, the three steps, copyable command or URL.                                                             | Combo switch, resilience preset, breaker reset, audit tables.                                                 |
| Try         | `/dashboard/playground`                                                   | The chat tab.                                                                                                                          | Compare, raw API, build.                                                                                      |
| Health      | `/dashboard/health`                                                       | Up or down, and the last error if the page already shows one.                                                                          | The rest of that page stays on the page, below the fold, not deleted.                                         |

Command Palette stays, and it searches the full `SIDEBAR_SECTIONS` catalog, not the short nav. That is the guaranteed way to reach compression, combos, audit, flags, and everything else without hunting for the header switch. Choosing a hidden area opens the existing page in the simple shell. It does not silently flip the mode.

### 6.4 Onboarding

Keep the current steps. Add a choice on `welcome`, before `tiers`:

- **Simple (recommended)** and **Full view**, as radio cards.
- On a fresh wizard the radio starts on Simple. Continuing writes `dashboardUiMode`. That write is the user's Continue action, not a silent default of the gateway. Abandoning the wizard leaves the key unset, which means original.
- Installs that already have `setupComplete` never enter the wizard, so they stay on original.
- The `done` step, when the choice was Simple, lists four links into existing screens: copy the endpoint, create a key, open a coding-tool card, optionally open MCP. It does not create the key or enable MCP by itself.

Do not add a second provider-connect implementation inside the wizard. The current `provider` and `test` steps stay.

### 6.5 What must not change in Full view

- Sidebar catalog, presets, and protected items.
- Request pipeline in `src/app/api/v1/chat/completions/route.ts`, `src/sse/handlers/chat.ts`, and `open-sse/handlers/chatCore.ts`.
- Combo strategies, `DEFAULT_WEIGHTS`, and the keyword intent classifier.
- `mcpEnabled` default false.
- `PII_REDACTION_ENABLED` and `PII_RESPONSE_SANITIZATION` default `"false"`.
- Feature-flag catalog defaults.
- Electron and PWA shells, other than the shared header switch.

## 7. Optional local model

### 7.1 What it is for, and what it must not do

Two jobs, both optional:

1. Help the operator finish setup (provider, key, coding tool, MCP) by explaining the next existing step.
2. Reduce time spent on requests that go through the user's API keys.

Job 2 is the one that is easy to get wrong. A model on the chat hot path **adds** latency. The routing work before the provider is already in-process. The keyword classifier is documented at under 1 ms. A sub-1B instruct model on CPU that emits a short JSON label takes hundreds of milliseconds to a few seconds on typical laptop CPUs. Third-party CPU figures published in 2026 (not measured on an OmniRoute box, and not a promise) put Qwen3-0.6B around the low tens of tokens per second on a weak i5, and smaller models such as LFM2.5-350M nearer 100 tokens per second on a 6-thread llama.cpp run. A 30-token label at those rates is a large fraction of a second before the provider is even contacted. On a request whose first target succeeds, that wait is pure loss. The provider hop dominates a successful request, and a local model does not make OpenAI, Anthropic, or any other upstream faster.

So the design that can actually help is:

- **Setup help is off the request path.** It runs when the operator opens the guide, never inside `handleChat` or `handleChatCore`.
- **Routing help is a cache written later.** After a request finishes, or on a timer, the model may label what happened and store a hint. The next request does a memory lookup. If the hint says the first target is cooled down or recently failed for this kind of call, the existing combo order can skip it. Skipping a doomed provider hop saves a full upstream timeout. Paying the model inline would cost more than today's scorer on the happy path.
- **While the flags are off, nothing in this section runs.** No process, no localhost call, no score change, no prompt sent anywhere.

Do not replace `intentClassifier.ts` with a neural model. Do not turn on compression ultra SLM, vector semantic cache, `jev`, or System One as a side effect. Those already have their own switches and their own latency.

### 7.2 Candidates under 1B parameters

Constraint: strictly under 1 billion parameters, CPU, instruct or tool-following, suitable for classification and for talking a user through a fixed checklist. Weights are not vendored in this repo. The operator's existing Ollama or llama.cpp process loads them.

| Model                                 | Params | Why it is on the list                                                                                                                                                               | Why it might lose                                                                                                                 | License note                                                                                                          |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Qwen3-0.6B** (recommended default)  | 0.6B   | Instruct model, 32K context, strong multilingual coverage, Apache-2.0, published GGUF, already a normal Ollama pull (`qwen3:0.6b`). Fits classification and short setup answers.    | Weak at open-ended facts and code. Fine for "which of these three transports" and poor as a general chatbot.                      | Apache-2.0. Confirm the card at implementation time.                                                                  |
| **LFM2.5-350M** (Liquid AI, 2026)     | 350M   | Fast on CPU, built for extraction, structured output, and tool use. Third-party llama.cpp CPU notes from 2026 put it near 100 tokens/s decode at Q4 on 6 threads, under about 1 GB. | The model card's own guidance is that it is not for knowledge or programming. A guide that invents OmniRoute facts will be wrong. | Liquid's LFM license, not Apache. Read it before distributing weights. Prefer telling the user to pull it themselves. |
| FunctionGemma 270M (Google, Dec 2025) | 270M   | Function-calling shape matches "propose the next setup action".                                                                                                                     | Google's own notes say the base model needs a fine-tune on the action set. Stock weights are the wrong default.                   | Gemma terms. Only after a fine-tune on this app's fixed action list, which is a later project.                        |
| Gemma 3 270M                          | 270M   | Very small and fast.                                                                                                                                                                | Too weak as an unfine-tuned guide.                                                                                                | Gemma terms.                                                                                                          |
| SmolLM2-360M-Instruct                 | 360M   | Smallest reasonable fallback if the two above are unavailable.                                                                                                                      | Weaker instruction following than Qwen3-0.6B or LFM2.5-350M.                                                                      | Apache-2.0 (Hugging Face SmolLM2). Confirm at implementation time.                                                    |

Out of scope even though people reach for them: Llama 3.2 1B (about 1.2B), Qwen3-1.7B, SmolLM2-1.7B, LFM2.5-1.2B, Gemma 3 1B, Phi mini, anything in the MLX Gemma / MLX Qwen provider entries (those are ~26B-class local servers already in the catalog). Qwen3.5-0.8B is under the cap and worth a re-check when implementation starts, because this size class is moving quickly. The recommendation stands on Qwen3-0.6B until that re-check.

Sources used for the 2026 picture, not as benchmarks we ran: [Tiny on-device LLMs in 2026](https://cskwork.github.io/posts/tiny-on-device-llms-sub-1b-models-2026/), Liquid / Qwen comparisons cited there, and the llama.cpp CPU table in [xllama `docs/benchmarks.md`](https://github.com/gianlucamazza/xllama/blob/main/docs/benchmarks.md) (measurements dated 2026-09-30 through 2026-10-11 on that author's machine).

### 7.3 How it runs

Use a local server the product already knows how to call. Do not add a new native runtime, do not shell out, and do not bundle weights.

1. The operator connects `ollama-local` or `llama-cpp` (or LM Studio) on the existing Providers screen. Default bases are in the table in section 4.1.
2. The operator pulls the model with that runtime's own tool (`ollama pull qwen3:0.6b`, or the equivalent llama.cpp model load). The app shows the command. It does not spawn it. Child-process routes are local-only for a reason (`docs/architecture/AUTHZ_GUIDE.md`, route guard tiers). A later, explicit "Download" button may call Ollama's local HTTP API only after a click, and only to the base URL already stored on that connection. That button is not part of the first model milestone.
3. A dashboard-only guide client sends chat completions to that base URL. It is not a new provider, not a new combo target, and not a call from `handleChatCore`.
4. Two new flags, both default off, both absent from the request pipeline when off:

```text
localGuideEnabled          default false
routingHintCacheEnabled    default false
```

Store them as feature flags in the existing catalog (category `runtime`, `defaultValue: "false"`, no restart), so the settings grid and the env override path already work. Do not reuse `SYSTEMONE_OLLAMA_LOCAL_BACKEND_ENABLED` or `COMBO_JEV_STRATEGY_ENABLED`. Those flags mean something else and must keep their current defaults.

When `localGuideEnabled` is false the guide UI renders the static checklist from section 7.4 and does not open a socket to port 11434, 8080, or 1234. When `routingHintCacheEnabled` is false the scorer does not read hints and `scorePool` output is unchanged. `DEFAULT_WEIGHTS` already has factors at weight 0 (`cacheAffinity`, `reliability`) so a new factor, if one is ever added, must ship at 0. Prefer not adding a factor at all in the first routing milestone: a side table the scorer consults only when the flag is on is easier to prove inert.

### 7.4 MCP and setup assist, using only current features

The guide is a scripted checklist with an optional narrator. The checklist works with the model disabled.

| Step                   | Existing feature the guide drives                                       | Model's only job                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Provider connected? | Providers page and `/dashboard/providers/new`                           | Explain which provider card matches what the user said. Link there. Do not create the connection.                                                   |
| 2. Client key exists?  | API Manager                                                             | Explain that the coding tool needs an OmniRoute key, distinct from the provider key. Link to API Manager. Do not create or display a stored secret. |
| 3. Endpoint            | Endpoint page base URL                                                  | Repeat the URL the page already shows.                                                                                                              |
| 4. Coding tool         | CLI Code cards                                                          | Help pick Claude Code, Codex, Cursor, Cline, or Continue, then open that existing card. Do not invent flags the card does not show.                 |
| 5. MCP                 | `/dashboard/mcp` enable switch and transport radios                     | Explain stdio vs SSE vs streamable HTTP in one paragraph. The user presses the existing switch. The guide never PATCHes `mcpEnabled` on its own.    |
| 6. Client config       | The command or URL the MCP page already renders, plus the CLI Code card | Fill the blank in a template that matches the on-screen transport. User copies it.                                                                  |

Allowed prompt context: the dashboard base URL, whether MCP is enabled, the transport enum, whether any client key exists (a boolean, never the key), tool names returned by `GET /api/mcp/tools`, and the operator's last question.

Forbidden in the prompt: provider credentials, client API key secrets, upstream request bodies, SQLite paths, and the contents of call logs. The routing-hint job may see an aggregated row the logs page already stores (provider id, model id, status class, latency bucket). It does not see prompt text.

If a later milestone gives the model tools, each tool is one existing dashboard action, and each call is a confirm button. v1 of the guide has no write tools.

### 7.5 Routing hint cache

Only when `routingHintCacheEnabled` is true:

1. A worker outside the request reads recent outcomes (success, 429, 5xx, cooldown) from the stores the logs and resilience pages already use.
2. Optionally asks the local model to map a coarse task class (the same labels the keyword classifier already emits: code, math, reasoning, creative, simple, medium) onto the target that has been failing. The model call is async. A request never awaits it.
3. Writes a small in-memory map: task class → target to deprioritize, with a timestamp.
4. On a later `auto` combo, if the flag is on and the hint is fresher than a few minutes, `resolveComboTargets` skips a target the breaker or cooldown would also skip, or moves a repeatedly failing target behind a healthy one. It uses the same gates as today (`open-sse/services/combo/executeTargetGates.ts`). The hint is not allowed to send a request to a target the breaker has opened, and it is not allowed to bypass quota or policy.
5. If the model is down, the map simply stops updating. Routing falls back to today's order. Startup with the flag on and Ollama down must behave like the flag off for scoring, and surface a single warning on the guide card.

This helps the failure path (avoid a second paid, slow, or rate-limited hop). It does not shorten a clean first hop. Be explicit about that in the UI copy: "Skip providers that just failed", not "Faster responses".

The vector semantic cache could someday use a local embedding model and save a network embedding. That feature is default off because the embedding is itself on the hot path. It is out of scope here. So is using the guide model as a compression SLM.

### 7.6 Inert when disabled

- Chat route modules do not import the guide client. A unit test imports the chat handler graph and fails if the guide module appears.
- Flags default `"false"`.
- No Electron startup task, no PWA background sync, no Ollama process spawn.
- Unset `ollama-local` connection plus the flag on shows "Connect Ollama on the Providers page" and does not probe arbitrary hosts. Probes, if any, go only to the stored base URL after the operator turns the flag on.

## 8. Risks

| Risk                                                 | Why it matters                                                                                | Mitigation                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Simple view writes sidebar hidden items              | Switching back destroys a custom Full layout, and essentials already hides MCP                | Separate `dashboardUiMode`. Test that PATCH of the mode does not change `hiddenSidebarItems` or `sidebarActivePreset`.         |
| A "byte-for-byte" reading that forbids the switch    | The switch has to be visible on Full view or novices cannot return                            | Full view gains the header switch and nothing else. Handlers do not branch on the mode.                                        |
| Model called inside `handleChatCore`                 | Adds hundreds of milliseconds to every successful request                                     | Guide client is not imported by the chat path. Hint evaluation is a memory read. Flags default off.                            |
| Guide writes settings or leaks secrets               | A setup assistant that PATCHes MCP or pastes a key is a behavior change and a credential leak | v1 has no write tools. Prompts get booleans and public catalog names. User presses the existing buttons.                       |
| New native runtime or vendored weights               | Breaks the Node-only support story, Electron packaging, and license review                    | Call an existing local provider. User pulls weights.                                                                           |
| Overloading System One or `jev`                      | Those flags already call external or local models for a different product                     | New flags, default false. Do not change the System One defaults.                                                               |
| PII or other security flags flipped for "simplicity" | Hard Rule 20                                                                                  | Do not touch those defaults. Existing opt-in test stays in the suite.                                                          |
| Simple shell forks a page and the fork drifts        | The "same behavior" promise dies                                                              | Simple nav mounts the existing page components. Disclosures hide regions with CSS or a boolean, they do not reimplement forms. |
| i18n                                                 | New strings in a feature PR belong in `en.json` only; translation waves fill other locales    | Follow that rule in the implementation phases. This note adds no UI strings.                                                   |
| Docs gates                                           | Invented routes, env vars, or file paths fail `check:fabricated-docs`                         | This note cites only current files and routes. Proposed names are in fenced plain text, not as shipped API paths.              |
| Scope creep into cheaper-inference/OmniRoute         | This work is fork-only                                                                        | Branches and PRs stay on EoUReDIt/OmniRoute-UX, base `release/v3.8.55`.                                                        |

## 9. Test strategy

No new product tests in this phase, because no product code changes. Later phases use the suites that already guard behavior.

**Prove Full view and the gateway did not change**

- `npm run test:unit` and `npm run test:vitest` (they cover different files; both are required).
- Playwright specs that already walk the shell: `tests/e2e/sidebar-navigation.spec.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/settings-toggles.spec.ts`, `tests/e2e/api-keys-flow.spec.ts`, `tests/e2e/combos-flow.spec.ts`, `tests/e2e/protocol-visibility.spec.ts`. There is no `toHaveScreenshot` / snapshot suite under `tests/e2e` on this branch. Do not invent one as the only proof. Add a focused toggle spec instead.
- `tests/unit/sidebar-customization.test.ts` and `tests/unit/sidebar-back-compat.test.ts` for preset behavior. Those tests must keep passing unchanged when the mode default is original.
- `tests/unit/pii-opt-in-default.test.ts` must keep passing untouched.
- A golden test around `scorePool` with a fixed candidate list: output identical when the hint flag is off, including when the flag is absent. Capture the golden before the routing milestone edits the scorer.
- Chat handler import boundary: the guide module is not in the chat module graph.
- With both model flags false, a test that fails if the guide client issues any HTTP request.

**Prove the switch works**

- Missing `dashboardUiMode` resolves to `original`.
- PATCH to `simple` and back to `original` round-trips and leaves `hiddenSidebarItems` and `sidebarActivePreset` untouched.
- E2E: default shell shows a Full-view-only row such as Combos. Switch to Simple: that row leaves the short nav, Home shows the checklist, header still offers Full view. Switch back: Combos returns. Visit `/dashboard/combos` directly while simple: the existing combo page renders.
- E2E: MCP enable still goes through the current switch and `PATCH /api/settings`, with the model flag off, and the static checklist is on screen.
- One browser test is not enough for Electron and PWA. After the shell lands, load the same server URL in a browser and confirm the cookie/DB round-trip. Electron uses that same server; a manual pass of the header switch in the desktop window belongs to the implementation milestone, not to this note.

**Prove the model stays optional**

- Flag default `"false"` asserted the same way other runtime flags are asserted.
- Guide page with the flag off does not call the local base URL (mock the global fetch).
- Guide page with the flag on and no `ollama-local` connection shows the Providers link and does not guess a host.
- Hint worker with the flag off does not start.

Run docs gates on any PR that edits this file: `npm run check:docs-all`.

## 10. Implementation milestones

Each milestone is a separate PR on this fork, base `release/v3.8.55`, and each one is revertible on its own. No milestone starts by editing `handleChatCore`.

| Milestone               | Ships                                                                                                                                                                    | Exit test                                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. This note**        | Design only.                                                                                                                                                             | Docs gates for this file. No `src/`, `open-sse/`, `electron/`, or `bin/` diff.                                                                                                                                                         |
| **2. Switch**           | `dashboardUiMode` on the settings row, header control, cookie mirror. Both shells render today's pages. Simple shell can be an empty short nav plus the command palette. | Round-trip test. Sidebar preset tests unchanged. Direct URLs still render. Chat unit tests unchanged.                                                                                                                                  |
| **3. Simple checklist** | Home checklist and the short nav from section 6.3, mounting existing pages. Welcome-step radio.                                                                          | New Playwright spec for the switch. Existing sidebar and API-key specs still pass on original.                                                                                                                                         |
| **4. Static MCP coach** | The checklist in section 7.4 with the model hard-off. Copy uses the strings and URLs the MCP and CLI Code pages already show.                                            | MCP enable e2e with no localhost model traffic.                                                                                                                                                                                        |
| **5. Opt-in guide**     | `localGuideEnabled` default false. Narration via an existing `ollama-local` or `llama-cpp` connection. No write tools.                                                   | Fetch mock proves no call when the flag is off. Prompt fixture test proves secrets are not interpolated.                                                                                                                               |
| **6. Hint cache**       | `routingHintCacheEnabled` default false. Async writer. Scorer consults the map only when the flag is on.                                                                 | `scorePool` golden matches when the flag is off. A fixture with a cooled-down target shows the skip only when the flag is on. A before/after log on a failing target is the latency evidence; do not claim a speedup without that log. |

Milestone 6 is the only one allowed to touch combo ordering, and only behind the flag. If the measurement does not show fewer wasted provider hops, leave the flag off and do not widen the hook.

## 11. Open questions for the owner

1. **Fresh-install radio.** This note preselects Simple on the welcome step, and writes it only when the operator presses Continue. Abandoning the wizard leaves original. Should Continue-with-the-default instead stay on Full view, so Simple is always an explicit opt-in even for new installs?
2. **Latency target.** If the goal is a faster _successful_ first hop, a local model cannot do that, and milestones 5–6 should stay setup-only. If the goal is fewer slow failures (429s and dead connections), the hint cache is the design that matches. Which one is the bar?
3. **Weights and license.** Is Apache-2.0 Qwen3-0.6B acceptable as the documented default pull, with LFM2.5-350M deferred until someone reads the LFM license? Should the app refuse to vendor weights permanently?
4. **Who starts the runtime.** Confirm the guide must never spawn Ollama or llama-server, and must never download weights, in the first model milestone. A later click-to-pull against the already configured local URL is a separate decision.
5. **Command palette in Simple view.** This note keeps it searching every sidebar entry, so nothing is unreachable. Should that search be limited to the short nav, with Full view as the only door to the rest? That is safer for novices and worse for "every feature stays reachable without a mode change".
6. **Per-device mode.** The switch is instance-global because settings are instance-global and Electron shares the server. Do you want a browser-local override for a shared dashboard?

## Appendix — every `page.tsx` route on this branch

Purpose is the screen's job from the page module or the sidebar catalog. Redirects were read from the page files cited in section 2.

### Public

| Route                                                   | Purpose                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `/`                                                     | Zed token query goes to `/callback`; otherwise `/dashboard`. |
| `/landing`                                              | Marketing.                                                   |
| `/login`                                                | Sign-in.                                                     |
| `/forgot-password`                                      | Password recovery.                                           |
| `/callback`                                             | OAuth / native token relay.                                  |
| `/auth/callback`                                        | Auth callback.                                               |
| `/connect/codex/[token]`                                | Codex connect handoff.                                       |
| `/docs`                                                 | Docs home.                                                   |
| `/docs/api-explorer`                                    | API explorer.                                                |
| `/docs/[...slug]`                                       | Doc page.                                                    |
| `/privacy`                                              | Privacy.                                                     |
| `/terms`                                                | Terms.                                                       |
| `/status`                                               | Status.                                                      |
| `/maintenance`                                          | Maintenance.                                                 |
| `/offline`                                              | PWA offline.                                                 |
| `/forbidden`                                            | Forbidden.                                                   |
| `/miniapp`                                              | Telegram mini app.                                           |
| `/400` `/401` `/403` `/408` `/429` `/500` `/502` `/503` | Error pages.                                                 |

### Dashboard shell

| Route                                    | Purpose                                              |
| ---------------------------------------- | ---------------------------------------------------- |
| `/home`                                  | Operator home.                                       |
| `/dashboard`                             | Redirects to `/home`.                                |
| `/dashboard/onboarding`                  | First-run wizard.                                    |
| `/dashboard/endpoint`                    | Endpoint hub (APIs, MCP, A2A, context sources).      |
| `/dashboard/api-manager`                 | Client API keys.                                     |
| `/dashboard/api-manager/[id]/access`     | One key's access policy.                             |
| `/dashboard/api-manager/routing`         | Per-key routing.                                     |
| `/dashboard/providers`                   | Provider connections.                                |
| `/dashboard/providers/new`               | Add-provider wizard.                                 |
| `/dashboard/providers/[id]`              | One provider.                                        |
| `/dashboard/providers/chatgpt/connect`   | ChatGPT OAuth finish.                                |
| `/dashboard/providers/services`          | Embedded service installers.                         |
| `/dashboard/models`                      | Model catalog.                                       |
| `/dashboard/combos`                      | Combo list.                                          |
| `/dashboard/combos/[id]`                 | One combo.                                           |
| `/dashboard/combos/live`                 | Combo studio.                                        |
| `/dashboard/combos/playground`           | Combo playground.                                    |
| `/dashboard/auto-combo`                  | Redirects to `/dashboard/combos?filter=intelligent`. |
| `/dashboard/quota`                       | Provider quota.                                      |
| `/dashboard/limits`                      | Redirects to `/dashboard/quota`.                     |
| `/dashboard/context`                     | Redirects to a context sub-route, default settings.  |
| `/dashboard/context/settings`            | Compression defaults.                                |
| `/dashboard/context/combos`              | Per-combo compression.                               |
| `/dashboard/context/caveman`             | Caveman engine.                                      |
| `/dashboard/context/rtk`                 | RTK engine.                                          |
| `/dashboard/context/headroom`            | Headroom engine.                                     |
| `/dashboard/context/session-dedup`       | Session dedup.                                       |
| `/dashboard/context/ccr`                 | CCR engine.                                          |
| `/dashboard/context/llmlingua`           | LLMLingua engine.                                    |
| `/dashboard/context/lite`                | Lite engine.                                         |
| `/dashboard/context/aggressive`          | Aggressive engine.                                   |
| `/dashboard/context/ultra`               | Ultra engine.                                        |
| `/dashboard/context/omniglyph`           | OmniGlyph engine.                                    |
| `/dashboard/compression`                 | Redirects to `/dashboard/context/caveman`.           |
| `/dashboard/compression/studio`          | Compression studio.                                  |
| `/dashboard/compression/exclusions`      | Compression exclusions.                              |
| `/dashboard/compression/live`            | Compression live view (no sidebar row).              |
| `/dashboard/cli-code`                    | Coding-tool setup cards.                             |
| `/dashboard/cli-code/[id]`               | One coding tool.                                     |
| `/dashboard/cli-agents`                  | CLI agents.                                          |
| `/dashboard/cli-agents/[id]`             | One CLI agent.                                       |
| `/dashboard/acp-agents`                  | ACP agents.                                          |
| `/dashboard/cloud-agents`                | Cloud agents.                                        |
| `/dashboard/conductor`                   | Conductor fleet.                                     |
| `/dashboard/orchestration`               | Orchestration.                                       |
| `/dashboard/tools/agent-bridge`          | Agent bridge.                                        |
| `/dashboard/tools/traffic-inspector`     | Traffic inspector.                                   |
| `/dashboard/discovery`                   | Discovery.                                           |
| `/dashboard/api-endpoints`               | API endpoint reference.                              |
| `/dashboard/webhooks`                    | Webhooks.                                            |
| `/dashboard/log-export`                  | Log export.                                          |
| `/dashboard/system/proxy`                | Proxy pool and MITM tabs.                            |
| `/dashboard/system/1proxy`               | Redirects to proxy `?tab=free-pool`.                 |
| `/dashboard/system/mitm-proxy`           | Moved banner, then agent bridge.                     |
| `/dashboard/relay`                       | Relay client.                                        |
| `/dashboard/analytics`                   | Usage analytics.                                     |
| `/dashboard/analytics/combo-health`      | Combo health.                                        |
| `/dashboard/analytics/utilization`       | Utilization.                                         |
| `/dashboard/analytics/compression`       | Compression stats.                                   |
| `/dashboard/analytics/search`            | Search analytics.                                    |
| `/dashboard/analytics/evals`             | Evals.                                               |
| `/dashboard/cache`                       | Response cache.                                      |
| `/dashboard/cache/media`                 | Media cache gallery.                                 |
| `/dashboard/provider-stats`              | Provider stats.                                      |
| `/dashboard/costs`                       | Cost overview.                                       |
| `/dashboard/costs/pricing`               | Pricing tables.                                      |
| `/dashboard/costs/teams`                 | Teams.                                               |
| `/dashboard/costs/budget`                | Budgets.                                             |
| `/dashboard/costs/quota-share`           | Quota share.                                         |
| `/dashboard/free-tiers`                  | Free-tier catalog.                                   |
| `/dashboard/free-provider-rankings`      | Free-provider rankings.                              |
| `/dashboard/radar`                       | Radar hub.                                           |
| `/dashboard/radar/combos`                | Radar combos.                                        |
| `/dashboard/radar/intel`                 | Radar intel.                                         |
| `/dashboard/radar/offers`                | Radar offers.                                        |
| `/dashboard/radar/setup`                 | Radar setup.                                         |
| `/dashboard/activity`                    | Activity feed.                                       |
| `/dashboard/logs`                        | Request logs.                                        |
| `/dashboard/logs/proxy`                  | Proxy logs.                                          |
| `/dashboard/logs/console`                | Console logs.                                        |
| `/dashboard/logs/timeline`               | Log timeline.                                        |
| `/dashboard/logs/activity`               | Permanent redirect to `/dashboard/activity`.         |
| `/dashboard/usage`                       | Redirects to `/dashboard/logs`.                      |
| `/dashboard/conversations`               | Conversations.                                       |
| `/dashboard/audit`                       | Audit.                                               |
| `/dashboard/audit/mcp`                   | MCP audit.                                           |
| `/dashboard/audit/a2a`                   | A2A audit.                                           |
| `/dashboard/health`                      | Health.                                              |
| `/dashboard/runtime`                     | Runtime processes.                                   |
| `/dashboard/resilience/connections`      | Connection resilience.                               |
| `/dashboard/resilience/cooldowns`        | Cooldowns.                                           |
| `/dashboard/translator`                  | Translator.                                          |
| `/dashboard/playground`                  | Playground studio.                                   |
| `/dashboard/search-tools`                | Search tools.                                        |
| `/dashboard/memory`                      | Memory.                                              |
| `/dashboard/agent-skills`                | Agent skills.                                        |
| `/dashboard/chaos`                       | Chaos settings.                                      |
| `/dashboard/omni-skills`                 | Omni skills.                                         |
| `/dashboard/mcp`                         | MCP enable, transport, and dashboard.                |
| `/dashboard/a2a`                         | A2A server.                                          |
| `/dashboard/plugins`                     | Plugins.                                             |
| `/dashboard/plugins/[name]/config`       | One plugin's config.                                 |
| `/dashboard/leaderboard`                 | Leaderboard.                                         |
| `/dashboard/profile`                     | Profile.                                             |
| `/dashboard/tokens`                      | Gamification tokens.                                 |
| `/dashboard/gamification/admin`          | Gamification admin.                                  |
| `/dashboard/media-providers`             | Redirects to the embedding kind list.                |
| `/dashboard/media-providers/[kind]`      | Media providers of one kind.                         |
| `/dashboard/media-providers/[kind]/[id]` | One media provider.                                  |
| `/dashboard/batch`                       | Batch jobs.                                          |
| `/dashboard/batch/files`                 | Batch files.                                         |
| `/dashboard/settings`                    | Redirects to a settings sub-route.                   |
| `/dashboard/settings/general`            | General / storage.                                   |
| `/dashboard/settings/appearance`         | Appearance.                                          |
| `/dashboard/settings/ai`                 | AI defaults.                                         |
| `/dashboard/settings/modality-bridge`    | Modality bridge.                                     |
| `/dashboard/settings/routing`            | Routing settings.                                    |
| `/dashboard/settings/resilience`         | Resilience settings.                                 |
| `/dashboard/settings/advanced`           | Advanced.                                            |
| `/dashboard/settings/security`           | Security.                                            |
| `/dashboard/settings/access-tokens`      | Access tokens.                                       |
| `/dashboard/settings/feature-flags`      | Feature flags.                                       |
| `/dashboard/settings/cache`              | Cache settings.                                      |
| `/dashboard/settings/sidebar`            | Sidebar layout.                                      |
| `/dashboard/settings/pricing`            | Redirects to `/dashboard/costs/pricing`.             |
| `/dashboard/changelog`                   | Changelog.                                           |
