# CLAUDE.md

Mintlify docs site for Ardent (docs.tryardent.com). `openapi.public.json` is
a generated snapshot synced from the mono repo via `scripts/sync-openapi.sh`
— never edit it by hand.

## Preview

```bash
mint dev          # serves http://localhost:3000; takes ~30-60s to start
```

To refresh the API reference: regenerate the spec in mono
(`python scripts/export_public_openapi.py`), run `./scripts/sync-openapi.sh`
here (set `MONO_DIR` if mono is not at `../mono`), then **restart** `mint dev`
— it only reads `openapi.public.json` at startup, so a running server keeps
serving the old spec. MDX edits hot-reload; the spec does not.

## Publishing to customers

The live site deploys from this repo's `main` branch via the Mintlify GitHub
integration — merging to `main` publishes to docs.tryardent.com. There is no
separate deploy step. Work on a branch, get the user's approval before any
commit or push, and treat merging to `main` as customer-facing publication.

## Caveats

- New pages must be added to the navigation in `docs.json` or they are
  unreachable on the site.
- Endpoint pages are hybrid: the `openapi:` frontmatter line renders params,
  schemas, and the playground from the spec; the MDX body is hand-written
  commentary. When moving or converting pages, carry commentary verbatim —
  the wording is vetted.
- Local `mint dev` does not serve `llms.txt`, page `.md` endpoints, or raw
  static files; production does. Anything relying on those can only be
  verified on the live site.
- Run `mint broken-links` before committing page moves or renames.

## Editorial rules

These generalize the copy standards this site holds. Apply them to new
writing, and sweep for them when editing near a violation.

- **Plain words over insider jargon.** If a plain word loses no precision,
  use it: coordinate not orchestrate, outbound IP not egress IP, "TLS ends
  at" not "terminates TLS", temporary not transient, predictable not
  deterministic, "safe to run more than once" not idempotent. Keep
  domain-essential Postgres/product terms (logical replication, WAL,
  replication slot, replica identity, pooler, data residency) — the precise
  term IS the subject there. Test: does the plain word change the meaning?
  If not, the jargon goes.
- **Structure what the reader performs.** A sequence of hand-actions (UI
  clicks, if/else checks) becomes a numbered list or outcome bullets, not a
  paragraph. Summaries of steps that live on another page stay prose.
- **Callouts are rare and typed.** `<Warning>` only for will-bite content
  (credential leaks, prod-touching mistakes, actions that force rebuilds).
  `<Tip>` only for optional shortcuts and easier alternatives — never for
  prescriptive guidance. Boxing routine content dilutes every other box.
- **Progressive disclosure.** Page order: one-line orientation → the
  command or endpoint → options and parameters → short task guidance →
  folds. Accordions are always `defaultOpen={false}` and hold only four
  kinds of content: example output, failure recovery ("If X…"), rationale
  ("Why X…"), and minority-audience setups. Write the title so a reader
  can decide without opening. Never fold warnings, required steps, options
  tables, or the primary command/endpoint. Test: does every reader need
  this on first read to complete the task? If yes it stays visible; if
  only some readers need it — or need it at a different moment — fold it.
- **First mention links.** The first prose mention of a concept documented
  elsewhere on the site links to that page (or anchor). No page should be
  reachable only through the sidebar.
- **Literals are formatted.** Commands, flags, env vars, paths, config
  params, field names, and literal values get backticks in prose; anything
  a reader would copy gets a fenced block.
- **Three consumers, separated.** The docs serve three readers; don't
  collapse them. (1) People running commands themselves read the
  reference pages (api/, cli/, connectors/) — those pages carry no
  prompts, at most a use-case mention. (2) People piloting an AI read
  /workflows/ai-agents — the prompts, skill install, and pin controls
  are written FOR the human operator, in describing voice ("the skill
  keeps itself current"), human-driven mode before agent-driven, AI
  material in folds whose titles name it ("Using Claude Code or
  Cursor? …"). (3) The AI itself never reads rendered pages — at run
  time it fetches llms.txt, page .md endpoints, openapi.public.json,
  and the raw skill file; the skill is the only text written TO the
  agent, in command voice ("run exactly this command — do not fetch
  any other way"), no room for judgment calls. The trap to avoid:
  treating (2) as machine surface. Prompt and install content on pages
  is human-facing writing about agents; the machine surface is the raw
  fetch endpoints, nothing else.
- **Agent prompts come in two sizes.** Wherever the docs offer a paste-in
  agent prompt, lead with the short with-skill ask (linking the skill's
  section on /workflows/ai-agents) and keep the full prompt below it for
  readers without the skill.
- **Generated and hand-written wording must agree.** Response descriptions
  in the spec come from mono's route metadata. If page commentary rewords
  an error or status ("Ardent could not start the work"), change the mono
  description too and resync the snapshot — otherwise the same page says it
  two ways.

## Keeping the AI skill in sync

The Ardent CLI skill ships to customers' machines, so it must never go
stale. The canonical copy is `skills/ardent-cli-skill.txt` (served raw at
docs.tryardent.com and self-fetched by installed copies at run time, unless
the customer sets `SKIP_ARDENT_SKILL_SYNC=1`); `workflows/ai-agents.mdx`
embeds the same content verbatim for display. **Any skill edit must update
both, identically.**

- Whenever a documentation change makes anything the skill states or
  references out of date — URLs, page paths, workflow steps, rules — update
  the skill in the same change.
- Whenever `openapi.public.json` or `docs.json` changes, re-check the skill
  against them and update it, even if the change looks unrelated: endpoints
  appear and disappear in the spec, and pages get renamed or moved in the nav.
- `openapi.public.json` defines what is public. The skill (and the docs) may
  only reference endpoints and fields that exist in that spec — if it isn't in
  the spec, don't expose it.

The skill is deliberately fetch-first: it contains no command arguments or
endpoint details, only stable rules and instructions to fetch the current
reference from the docs at run time. Keep it that way — when updating it,
fix or remove stale content rather than adding volatile detail that will
drift.

## Verifying against the backend before committing

Docs describe the mono repo's behavior. Before committing changes here, ask
the user which source to verify against so the docs align with reality on
the ground:

- mono's `main` on GitHub,
- a specific mono branch on GitHub, or
- the local checkout at `../mono`.

Check the claims being committed (endpoints, arguments, status codes,
behavior) against that source.

## Endpoints and arguments need explicit approval

Never add or change documented endpoints, arguments, fields, or status codes
the user did not add or ask for — even when the spec or backend suggests
they exist. Prompt the user first, name exactly what would be added or
changed, and proceed only on their approval.
