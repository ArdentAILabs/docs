#!/usr/bin/env bash
# Copy the public OpenAPI snapshot from the mono repo into the docs site.
#
# The snapshot is generated in mono by scripts/export_public_openapi.py and
# committed there as openapi.public.json. This script assumes mono is checked
# out next to this repo (../mono); override with MONO_DIR.
set -euo pipefail

docs_root="$(cd "$(dirname "$0")/.." && pwd)"
mono_dir="${MONO_DIR:-$docs_root/../mono}"
src="$mono_dir/openapi.public.json"

if [ ! -f "$src" ]; then
  echo "Not found: $src" >&2
  echo "Run 'python scripts/export_public_openapi.py' in mono first, or set MONO_DIR." >&2
  exit 1
fi

cp "$src" "$docs_root/openapi.public.json"
echo "Updated $docs_root/openapi.public.json"
