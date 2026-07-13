# Ardent Docs

Documentation for [Ardent](https://tryardent.com) — Git for your data infrastructure.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview locally:

```
npm i -g mint
```

Run at the root of the docs directory:

```
mint dev
```

View at `http://localhost:3000`.

## API reference pages

Endpoint pages under `api/` are hybrid: parameters, schemas, and the request
playground are generated from `openapi.public.json` (via the `openapi:` field
in each page's frontmatter), while the page body is hand-written commentary.
Edit the MDX body freely; never edit `openapi.public.json` by hand — it is a
generated snapshot.

### Keeping the spec in sync with mono

The snapshot is generated in the mono repo by
`scripts/export_public_openapi.py` (the allowlist in that script defines the
public API surface) and committed in both repos. To refresh it here:

```
# 1. In mono: regenerate the snapshot from the FastAPI app
cd ../mono
python scripts/export_public_openapi.py

# 2. In docs: copy it over
cd ../docs
./scripts/sync-openapi.sh
```

The sync script assumes mono is checked out next to this repo (`../mono`).
If it lives elsewhere, point at it with `MONO_DIR`:

```
MONO_DIR=/path/to/mono ./scripts/sync-openapi.sh
```

After syncing, restart `mint dev` — it only reads the OpenAPI file at
startup, so a running server keeps serving the old spec.

Mono's CI runs the exporter with `--check`, so any PR there that changes the
public API surface fails until the snapshot is regenerated — that diff is the
signal to sync it here and update the affected pages.

### Adding an endpoint page

1. Add the route to `PUBLIC_ENDPOINTS` in mono's
   `scripts/export_public_openapi.py`, regenerate, and sync (steps above).
2. Create the MDX page with frontmatter pointing at the operation, e.g.:

   ```yaml
   openapi: "/openapi.public.json GET /v1/operations/{operation_id}"
   ```

3. Add the page to the navigation in `docs.json`.
