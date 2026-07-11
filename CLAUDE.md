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
