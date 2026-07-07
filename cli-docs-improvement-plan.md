# CLI docs improvement plan

Scope: `cli/*.mdx` compared against `../mono/packages/ardent-cli/src` (CLI v0.0.29).
Code references below are into `mono/packages/ardent-cli/src/`.

## Diagnosis

The CLI docs are in decent shape structurally, but they have accumulated two problems:

1. **Drift.** Several load-bearing claims no longer match the code — most seriously,
   the credential-precedence story is inverted, and the branch-create JSON/timeout
   docs describe an older CLI. Recent doc commits patched edge cases one at a time,
   which fixed local accuracy but froze in some now-stale claims.
2. **Caveat accretion.** The same incremental commits piled operational caveats
   (polling overrides, retry semantics, cache behavior, TLS notes) directly into the
   main reading flow. The overview page — the first page anyone reads — spends ~30 of
   its 120 lines on poll-interval validation trivia. The important stuff (env-var
   precedence, exit codes, JSON contract) is either wrong, missing, or buried.

The fix is one pass that (a) corrects the wrong claims, (b) adds the missing
automation contract users actually need, and (c) moves edge-case detail behind
accordions or onto a dedicated configuration page.

---

## P0 — Inaccuracies (docs say something the code contradicts)

### 1. Credential/API-URL precedence is inverted ⚠ worst offender
- **Docs:** `cli/overview.mdx:77-78`, `cli/auth.mdx:59`, and the GitHub Actions
  example `cli/auth.mdx:69` all say a stored login token wins over `ARDENT_TOKEN`,
  and tell users to run `ardent logout` to force the env var.
- **Code:** the env var wins. `getResolvedToken()` checks `process.env.ARDENT_TOKEN`
  first (`lib/config.ts:156-168`); `getApiUrl()` is
  `process.env.ARDENT_API_URL || getConfig("apiUrl") || "https://api.tryardent.com"`
  (`lib/config.ts:146`).
- **Fix:** rewrite precedence as *env var > stored login > default*. Delete the
  `ardent logout` CI step and its "important on self-hosted runners" comment; delete
  both "stored token is used first" cells in the overview env table. This removes
  ~15 lines of now-wrong caveats and simplifies the CI story to "set `ARDENT_TOKEN`,
  done."

### 2. Branch-create timeout: 65 minutes, not 10
- **Docs:** `cli/overview.mdx:86` (`ARDENT_BRANCH_CREATE_MAX_WAIT_MS` default
  `600000` / 10 minutes) and the sample timeout output `cli/branches.mdx:48`
  ("did not complete within 10 minutes").
- **Code:** `BRANCH_CREATE_MAX_WAIT_MS = 65 * 60 * 1000` (`commands/branch/create.ts:91`);
  the message interpolates the real budget. Delete's 10-minute default is correct
  (`commands/branch/delete.ts:33`).
- **Fix:** correct the default and the sample output (65 minutes).

### 3. Branch JSON example is an old schema
- **Docs:** `cli/branches.mdx:58-72` shows `"schema_version": 1` and a field set
  missing half the payload.
- **Code:** `BRANCH_JSON_SCHEMA_VERSION = 3` (`lib/branch_output.ts:81`); payload also
  includes `pooled_branch_url`, `pooled_branch_prisma_url`, `read_ready_at`,
  `write_ready_at`, `masked_ready_at`; `warning` is `{type, message} | null`.
- **Fix:** replace the example with a real v3 payload. Also document the JSON *error*
  envelope (`{schema_version: 1, error: {code, message}}`) and its stable codes
  (`offline`, `not_found`, `timeout`, `api_error`, …, `lib/branch_output.ts:86-116`) —
  this is exactly what CI authors need and it is documented nowhere.

### 4. `--url-type` and pooled URLs don't exist in the docs
- **Code:** `branch create --url-type <direct|pooled|prisma>` (`commands/branch/index.ts:16`,
  default `direct`); conflicts with `--format json` (exit 2). Pooled and Prisma URLs
  are first-class in the JSON payload and in `branch info` pretty output.
- **Fix:** add `--url-type` to the branch-create options table; mention pooled/prisma
  URLs where connection URLs are explained.

### 5. Stale example outputs on `branch list` / `branch info`
- **Docs:** `cli/branches.mdx:102-119` shows a URL under each list row;
  `cli/branches.mdx:129-137` shows a `URL:` line in info output.
- **Code:** `branch list` prints a metadata line
  `service_type · readiness · created YYYY-MM-DD · idle … (status)` — no URL
  (`commands/branch/list.ts:75`). `branch info` prints `Ready:` plus labeled
  `Direct URL:` / `Pooled URL:` / `Prisma pooled URL:` lines (`commands/branch/info.ts:342-357`).
- **Fix:** regenerate both example blocks from the current CLI.

### 6. `connector list` legend is oversimplified to the point of wrong
- **Docs:** `cli/connectors.mdx:147` — "`●` ready; `○` not".
- **Code:** four states: green `●` healthy, yellow `●` degraded, cyan `◐` setup
  pending, red `○` broken; plus `⚠ N` warning counts, `[delete locked]`, and
  `[<status>]` brackets (`lib/connector_render.ts:63-95`, `commands/connector/list.ts:161-198`).
- **Fix:** update the legend and example. (Degraded and delete-locked are states users
  will actually see and search for.)

### 7. Smaller corrections
- `cli/settings.mdx:90-93` — `--project` takes the Supabase CLI project **id**, not a
  name (`commands/settings/index.ts:42-46`). `unlink` also accepts
  `--skip-health-check` (`index.ts:55-59`).
- `cli/auth.mdx:85-91` — `ardent status` also prints an `Account:` line
  (`commands/auth/status.ts:17-25`).
- `cli/overview.mdx:78` — logout "clears the stored API URL…" framing survives, but
  since env now wins, the whole motivation for that sentence disappears (see P0-1).
- `cli/connectors.mdx:20` — preflight's type argument is case-sensitive `postgresql`
  (`commands/connector/preflight.ts:176-182`); create's is case-insensitive. Not
  worth a caveat — just keep examples lowercase.

---

## P1 — Important missing information

### 1. Undocumented user-facing commands
| Command | What it does | Where it should live |
| --- | --- | --- |
| `connector status <name>` | Humanized engine/connection status + setup progress. The docs *already reference its output* ("In connector status output, `validating` means…", `cli/connectors.mdx:188`) without ever documenting the command. | connectors.mdx, before retry-setup |
| `connector lock [--reason] / unlock` | Deletion lock; blocks `connector delete` with a specific error and shows `[delete locked]` in list (`commands/connector/lock.ts`, `delete.ts:118-122`) | connectors.mdx (can be an "Operational safeguards" accordion) |
| `connector quarantine list / release <name> <id>` | Inspect and release paused CDC; quarantines are *not* visible in `connector status` (`commands/connector/quarantine.ts`) | same accordion |
| `connector list --fail-on-warnings` | Exit 2 if any connector has warnings — built for CI (`commands/connector/index.ts:96`) | connectors.mdx + CI docs |
| `environment show <id> --allowlist` | Prints source-side IP allowlist JSON for BYOC/private-network setups (`commands/environment/show.ts`) | wherever `--environment-id` is introduced |

### 2. Exit codes — documented nowhere, essential for CI
The CLI has a consistent contract: `0` success, `1` runtime/API failure, `2` usage
and validation errors (bad flags, unsupported `--format`, preflight failure,
`--fail-on-warnings`, removed `branch diff`). One small table on the automation/
configuration page covers it.

### 3. Config file location
`~/.ardent/config.json` holds token, API URL, selections, and cache
(`lib/config.ts:9-10`). Users need this to understand what `logout` deletes and what
state a CI runner carries. One sentence under logout + one on the configuration page.

### 4. Connector create/retry flags
- `--write-replica-plan <path>` — writes a replica-identity plan file; exits 0 before
  setup when decisions are outstanding (`lib/replica_identity_prompt.ts:376-413`).
- The three replica-identity flags are mutually exclusive (`prompt.ts:328-341`), and a
  non-TTY run with undecided tables exits 1 naming all three — that's the CI-relevant
  behavior worth one sentence.
- `--allow-high-rtt-placement` (preflight + create, BYOC-gated).
- Auto-naming when `--name` is omitted (derived from project/db/host with numeric
  dedup, `commands/connector/create.ts:38-68`) — one sentence so users know omitting
  `--name` is fine.
- `connector delete`: 409 "un-replicated changes" refusal and the deletion-lock error
  are the two failure modes users will hit; each deserves one line next to `--force`.

### 5. `branch_sql` hooks (advanced settings)
`settings set/remove` support `--hook <name>`, `--database/--no-database`,
`--run-as/--no-run-as`, `--order <n>` for multiple named `branch_sql` policies
(`commands/settings/index.ts:20-37`, `lib/settings.ts:95-196`). Document as a
collapsed "Multiple branch SQL hooks" subsection — classic most-users-don't-need
material.

### 6. Warn that `project delete` has no confirmation
It deletes immediately, no prompt, no `--force` (`commands/project/delete.ts:58-60`).
One `<Warning>` in projects.mdx.

### 7. Invite roles
`ardent invite <email> [role]` accepts `owner|admin|member|viewer` (`commands/invite/send.ts:5`);
docs only show `admin` and the `member` default. One sentence reusing the role list
already in org.mdx.

---

## P2 — Verbosity and progressive disclosure

House pattern is already right: short prose + collapsed `<Accordion>` for example
output. Extend the same pattern to edge-case semantics.

### 1. New page: `cli/configuration` ("Configuration & automation")
Move out of `overview.mdx`: the full env-var reference (including the polling table
and its Warning block), precedence rules, config-file location, exit codes, and the
JSON output/error contract. Overview keeps a two-row env table (`ARDENT_TOKEN`,
`ARDENT_API_URL`, one line each — accurate after P0-1 they *become* one-liners) and
links to the new page. This cuts overview from 120 to ~85 lines and gives automation
authors one canonical destination. Add to `docs.json` nav (fits the existing
"Workspace" group or its own entry after overview).

Within the new page, the invalid-override-value asymmetry (create throws on negative
poll intervals, delete silently defaults — verified against `create.ts:107-117` and
`delete.ts:33-43`) collapses to one accordion: "How invalid override values are
handled". The current inline `<Warning>` at `overview.mdx:91-93` reads as scary and
is irrelevant to anyone using positive integers — which the intro line already
mandates. Also add `ARDENT_BRANCH_CREATE_OPERATION_WAIT_SECONDS` (default 5, max 10,
`create.ts:99-131`) here rather than in overview.

### 2. branches.mdx: consolidate timeout/retry prose
Create and delete each carry a multi-paragraph timeout narrative
(`branches.mdx:44-50`, `177-186`). Keep one visible sentence each ("If it times out
it may still be running server-side; re-running the same command resumes rather than
duplicates") and fold the mechanics — idempotency scope (connector + service + name),
cache-refresh behavior after delete timeout, operation-id-for-support — into one
accordion per command. Net: ~25 lines of main-flow prose → ~8.

### 3. branches.mdx: TLS/channel-binding section
`branches.mdx:80-90` spends three paragraphs on certificate fields and channel
binding. Keep the two actionable rules visible (use the URL exactly as returned; if
your client errors, clear custom CA fields and disable channel binding) and move the
explanation of *why* into an accordion ("Why branch TLS differs from your source
database"). Note: the CLI passes URLs verbatim from the backend — `channel_binding`
appears nowhere in CLI source — so verify the query-string claims against the
backend-issued URLs before rewording (see "Verify" below).

### 4. connectors.mdx: retry-setup section
`connectors.mdx:186-188` is one dense paragraph mixing three scenarios. Restructure
as three short bullets (stale checks → re-check first; already healthy →
short-circuit; already validating → decisions frozen, exit 1) — same facts, scannable.
Documenting `connector status` (P1-1) lets this section stop describing status
output inline.

### 5. Keep deliberately undocumented
- `staff …` — hidden, staff-only.
- `branch diff` — hidden deprecation tombstone (stderr + exit 2). No docs needed;
  its own error message explains itself.
- Hidden legacy `--byoc-neon/--api-key/--project-id` create flags.
- `settings supabase` internals (Docker container surgery, proxy script) — behavior
  description in docs is at the right altitude already.

---

## UX — onboarding (priority)

The onboarding surface today is six parallel copies of the same flow: `quickstart.mdx`,
the 40-line Claude prompt embedded in `index.mdx`, and four provider pages
(`connectors/{supabase,rds,planetscale,self-hosted}.mdx`) that are each themselves a
full install→login→preflight→create→branch quickstart. Nothing routes between them,
so a Supabase user who lands on the generic quickstart pastes a connection string
that is likely the pooler URL and fails preflight — while the page that would have
prevented it sits unlinked under a nav group named "Connectors."

### 1. One canonical funnel with provider routing
Make `quickstart.mdx` the single onboarding path. Replace its generic "Preflight your
database" input with a "Get your connection string" step using `<Tabs>` (Supabase /
RDS / PlanetScale / Self-hosted) that contains only the two provider-specific facts:
where to copy the right connection string and which prerequisite commonly blocks
preflight (Supabase: direct connection, not the pooler; RDS: `rds.logical_replication`
parameter + reboot). The full provider pages remain as the deep-dive the quickstart
links to when preflight fails — retitle their role ("Provider setup details"), and
trim their duplicated install/login/branch steps down to links back to the quickstart.
One flow to maintain instead of five.

### 2. Give the quickstart a finish line
It currently ends at `branch create` with "Done." Add the aha-moment step: actually
connect and query —

```bash
psql "$(ardent branch info --print-url)" -c 'select count(*) from your_table;'
```

— proving the branch is real data, isolated from prod. This is also where the one
practical connection caveat belongs (clear custom CA fields / disable channel binding
if the client errors), as a one-liner linking to the branches page.

### 3. Expected output per step
The quickstart shows zero command output; the CLI pages all use collapsed accordions
for it. First-time users need to know what "good" looks like, especially at `login`
(auto-selection message) and `connector create` (progress stages). Reuse the house
accordion pattern per step.

### 4. Defuse the slow step
"Setup takes minutes to hours" is where users bail or think it's broken. Two sentences
fix it: setup runs server-side, so a dropped terminal doesn't lose work; if the CLI
is interrupted, `ardent connector retry-setup <name>` resumes rather than restarts
(verified: retry-setup handles the interrupted-`validating` state,
`commands/connector/retry-setup.ts:1-26`). Verify with backend that Ctrl-C mid-setup
is genuinely safe before promising it.

### 5. "If preflight fails" ramp
Preflight is the most likely first-run failure. Add a short routed list under that
step: grant script printed → run it and re-run preflight; `wal_level` failure →
provider tab anchor; duplicate-source failure → you already have a connector,
`ardent connector list`. Keeps the happy path clean while catching the three real
failure modes.

### 6. Cover account creation
The quickstart's first interactive step is `ardent login`, which assumes an account
exists. State that sign-up happens in the same browser flow (the index Claude prompt
already implies it: "finish sign-up or login") — verify, then say it explicitly.

### 7. Copy-paste hygiene
The quickstart makes users paste their connection URL twice. Adopt the define-once
pattern the index Claude prompt already uses:
`export ARDENT_DB_URL='postgresql://…'` then `"$ARDENT_DB_URL"` in both commands.
Every block becomes copyable without editing.

### 8. Shrink the landing page's second quickstart
The Claude prompt on `index.mdx` is a great hook but it is a second, hand-maintained
copy of the flow occupying half the landing page — and it will drift (it already
phrases setup-wait guidance differently than the quickstart). Collapse it into an
accordion or a small "Set up with Claude" card, and treat the quickstart as its
source of truth when either changes.

### 9. Intent-based next steps
After the finish line, route by what the user came for — the three workflow pages
already exist: coding agents (`workflows/ai-agents`), CI branches per PR
(`workflows/ci-cd`), local dev (`workflows/local-dev`). Replace the current
bullet list + generic cards with three intent cards.

### 10. Consistency nits on the funnel pages
- Idle suspend: `index.mdx:91` says "after 5 minutes"; `cli/branches.mdx:187` says
  "a short idle period." Pick one number and reuse it.
- `quickstart.mdx:78` card is labeled "Connector docs" but links specifically to
  `/connectors/supabase`.
- "GitHub or email" login claim appears here too (`quickstart.mdx:27`) — same
  verify item as auth.mdx.

## Verify against backend before publishing (CLI source can't confirm)
- Branch URL query params (`sslmode=require&channel_binding=disable`) in all example
  URLs — the CLI prints backend URLs verbatim.
- `branch create` pretty success line ("created and checked out in 4.2s") and
  `connector create` success output — regenerate examples from a live run.
- Whether browser login supports email as well as GitHub (`auth.mdx:14` says
  "GitHub or email"; the CLI help says GitHub OAuth — the web flow decides).
- Whether sign-up is part of the `ardent login` browser flow (UX item 6).
- Whether interrupting `connector create` client-side is always safe to resume with
  `retry-setup` (UX item 4).

## Suggested execution order
1. **PR 1 (correctness):** P0 items 1–3 — precedence rewrite, timeout default, JSON
   schema. These are actively misleading CI users today.
2. **PR 2 (correctness, cosmetic):** P0 items 4–7 — flags and stale example outputs.
3. **PR 3 (structure):** create `cli/configuration`, move env/exit-code/JSON contract
   content, slim overview + branches per P2.
4. **PR 4 (coverage):** P1 missing commands and flags (connector status/lock/
   quarantine, environment show, branch_sql hooks, project-delete warning).
