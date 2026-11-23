#!/bin/sh
#
# Adapts public/_redirects (written for Netlify, which still hosts the site) to
# Cloudflare Workers static assets, after Hugo has built the site:
#
# - "301!" becomes "301": Netlify needs the "!" to redirect even when a file exists
#   at the old path; Cloudflare always applies a redirect first and rejects the "!".
# - The "404" rewrite rules are dropped: Cloudflare has no status rewrites, and
#   wrangler.jsonc's "404-page" handling already serves /en/404.html under /en/.
#
# Remove this script (and its call in .github/workflows/deploy.yml) once Netlify is
# gone, after rewriting static/_redirects in Cloudflare's syntax.

set -e
file="${1:-public}/_redirects"
[ -f "$file" ] || { echo "workers-redirects: $file not found (run the build first)" >&2; exit 1; }

sed -E -e 's/[[:space:]]301!$/ 301/' -e '/[[:space:]]404$/d' "$file" > "$file.tmp"
mv "$file.tmp" "$file"
