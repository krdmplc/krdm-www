# AGENTS.md

Guidance for AI coding agents (and humans) working on **krdm.si**, the bilingual
website of Društvo KRDM, a non-profit music association from Kranj, Slovenia.

Stack: **Hugo** (static site) → **Netlify** (build/host, `main` = production) →
**Decap CMS** at `/admin/` (Decap Turbo: sign-in, roles, GitHub proxy). Seeded from
[hugo-template](https://github.com/poslovnimediji/hugo-template); compare with it
when updating tooling, but this site deviates where noted below.

## Commands

```bash
npm ci           # install (Node >= 22.13)
npm run dev      # hugo server → http://localhost:1313 (CMS: npx decap-server, then /admin/)
                 # serves from public/ — don't build into or delete public/ while it runs
npm run build    # hugo → public/
npm run lint     # eslint + stylelint — the same gate Netlify runs before building
```

There is no test suite. **`npm run lint` plus a clean build is the verification
story**, and a build must emit zero `WARN` lines (treat a new Hugo deprecation as a
failure). To reproduce a production build, including `robots.txt` and indexing tags:

```bash
CONTEXT=production URL=https://www.krdm.si/ ./bin/build.sh
```

Never call `hugo` bare in scripts: everything goes through `bin/with-dart-sass.sh`,
which puts the Dart Sass binary from `sass-embedded` on `PATH`. A machine with its
own Dart Sass hides that breakage.

## Git workflow (required)

Several people and their agents work on this repo, and `main` deploys to
production (Netlify, and the Cloudflare Worker). Nobody pushes to `main`
directly; every change goes through a pull request. GitHub enforces this with a
ruleset on `main`.

1. Start each change from an up-to-date `main`: `git switch main && git pull`,
   then `git switch -c <type>/<topic>` (`fix/cart-total`, `feat/merch-filter`).
   One branch per change.
2. Never commit on `main`, push to `main`, force-push, or rewrite a branch
   someone else pushed. Never merge your own PR. If you find you've made changes
   on `main`, `git switch -c <branch>` before committing; the changes come with you.
3. Before pushing, run `npm run lint` and `npm run build` (zero `WARN` lines).
   Don't push a branch that fails them.
4. Push the branch and open a PR: `gh pr create --base main`. Title says what
   changes; the body says why, how you checked it, and the preview URLs: the
   Netlify deploy preview and `https://<branch>-krdm-www.krdm.workers.dev`
   (slashes in the branch name become dashes).
5. Keep PRs small and on one topic. Don't reformat or "tidy" files you didn't
   need to touch, and never commit a real branch name in `static/admin/config.yml`.
6. If something seems to need a change on `main`, production settings, or
   secrets, stop and ask in the PR. Don't work around it.

Content edited in the CMS is committed to `main` directly by Decap Turbo; that
is expected and allowed by the ruleset.

## Content model

Two languages: **`sl` (default, served at `/`)** and **`en` (`/en/`)**. Every content
file exists as `name.sl.md` + `name.en.md`.

| What | Files | URL (sl / en) |
|---|---|---|
| Events | `content/events/<name>.<lang>.md` | `/dogodki/<name>/` · `/en/events/<name>/` |
| Releases | `content/releases/<name>.<lang>.md` | `/izdaje/<name>/` · `/en/releases/<name>/` |
| Merch | `content/merch/<name>.<lang>.md` | `/merch/<name>/` · `/en/merch/<name>/` |
| Artists | `content/artists/<ref>/_index.<lang>.md` | `/ustvarjalci/<slug>/` · `/en/artists/<ref>/` |
| Pages | `content/{about,join,play,cookies}.<lang>.md` | Slovenian `slug` in front matter |
| Home | `content/_index.<lang>.md` | `/` · `/en/` |

- **Artists are taxonomy terms**, not a section (`[taxonomies] artist = "artists"`).
  Events, releases and merch list them in `artists: [ref, …]`; templates resolve them with
  `.GetTerms "artists"`. An artist's `ref` **must equal its folder name**, otherwise
  Hugo creates an empty term page. `static/admin/index.js` keeps them in sync on save.
- Front matter fields: `title`, `description` (meta description — optional, a good
  one is generated otherwise), `thumbnail` (`/media/uploads/…`), events: `startDate`,
  `endDate`, `venue` (`"Venue, Town"`; the part after the comma becomes the
  locality in JSON-LD), `price` (`"8 €"`); releases: `releaseDate`.
- Releases have `format` (`album` — LPs and EPs — or `single`) for the filter on the
  releases page. Events have `series` (`distorzn`, `plc-fest`, `other`) for
  the filter on the events page. Artists have `status` (`active` default, `hiatus`, `inactive`),
  `featured: true` (pinned first) and `hideOnHome: true` (no longer with KRDM). The
  home page shows only active, non-hidden artists, ordered by latest release/event.
  The artists page splits them into "active" (that same set) and "other"; the
  individual status is not shown publicly.
- **Merch** has a cart but no checkout: item pages have an add-to-cart form, the cart
  (`content/cart.*.md`, `{{</* cart */>}}`, `assets/scripts/cart.js`) lives in
  localStorage as item + size + quantity, and the order goes out as the Netlify
  Forms form `order` (`order-number` KRDM-YYMM-XXXX, readable `items` and `total`
  first), emailed to us like the contact form — Netlify emails every field, so keep
  the form to what we want to read; `{{</* order-done */>}}` on the thank-you page
  repeats the number and the order and empties the cart. Titles, prices and stock state come from JSON built into the cart
  page, never from the browser. Item pages also link to the contact form with
  `?item=<name>` (pre-filled by `assets/scripts/contact-prefill.js`; the only action
  without JS) and to `link` (Bandcamp) if set. The list filters by `category` and by band
  (`partials/func/merch-bands.html`: an item's one or two bands, or "KRDM" when it
  lists more or none — the KRDM shirt). Fields: `category` (`apparel`, `music`, `other`),
  `price` (a **number** in euros, formatted by `partials/func/price.html`, kept
  numeric for a future checkout), `sizes` (a list of `{size, stock}`), `available`
  (`false` = listed as sold out, last), `release` (a release's file name; the
  release page then lists the item), `images` (extra photos). `sizes` and `images`
  live **only in the Slovenian file**: Decap can't copy a list to the other language
  (list widgets take only `i18n: true`; `i18n: duplicate` on one fails config
  validation and the whole CMS won't load), so both languages read them through
  `partials/func/merch-source.html`. Stock counts —
  `stock` per size, `quantity` for items without sizes — are internal and must
  never be rendered: a size with `stock: 0` is only struck through, and an item
  whose sizes are all at 0 is sold out (`partials/func/merch-sold-out.html`; use
  it, never `.Params.available` directly). A size without `stock` is untracked
  and counts as in stock. JSON-LD: `Product` with an `Offer`.
- There is **no public email address** (info@krdm.si is dead): contact goes through
  the Netlify Forms form on `content/contact.*.md` (`{{</* contact-form */>}}`), whose
  notifications are configured in the Netlify UI (so are the `order` form's). Both forms
  are sent with fetch by `assets/scripts/netlify-form.js`: each form name is shared by
  both languages and Netlify keeps one success page per form, so a plain POST could
  land on the other language's thank-you page. Event prices appear only on event pages,
  never in listings; merch prices do show on cards.
- **Stats** (`content/stats.*.md`, `layout: stats` → `layouts/stats.html`, `/statistika/` ·
  `/en/stats/`) counts past events and releases. `partials/func/stats-data.html` builds
  the data (JSON in the page for `assets/scripts/stats.js`, which draws the charts and
  filters by `?artist=`, `?from=`, `?to=`); `partials/func/stats-summary.html` counts the
  totals Hugo renders there, on artist pages and in `llms.txt` — keep it and the JS in
  step. The same venue written two ways is merged in `data/venues.yaml` (aliases only;
  events stay as written), so add an alias rather than renaming a venue in old events.
  The maps place towns from `data/towns.yaml` (lat/lon, and `country` abroad):
  Slovenian ones on `assets/maps/slovenia.svg`, foreign ones on `assets/maps/europe.svg`
  (each drawn for that file's `maps` bounds; farther towns are listed under it). An
  event in a town that isn't listed makes the build warn — add the town. Venues abroad
  use the local town name (`Wien`, `Praha`), as the venue is shared by both languages.
- `showInAdmin: true` (Slovenian files) and `pageType: page` are filters for Decap's
  listings — keep them on new content.
- Slovenian URLs come from `[languages.sl.permalinks]` in `hugo.toml` and the `url:` /
  `slug:` front matter of section and page files. **Changing any URL needs a 301 in
  `static/_redirects`** — the file already maps every URL from the pre-2026 site.

## Build pipeline (non-obvious parts)

- **Images**: Decap uploads to `static/media/uploads/`, and `hugo.toml` mounts that
  folder (and `static/media/brand/`) into `assets/` too. `layouts/partials/image.html`
  resizes to WebP with `srcset` and intrinsic dimensions; Markdown images go through
  the same partial via `layouts/_default/_markup/render-image.html`. Always render
  images through it rather than writing `<img>` by hand. Images are plain git blobs —
  the site used Netlify Large Media (Git LFS) until 2026, which Netlify retired.
- **SCSS** is compiled by Hugo (`layouts/partials/base/styles.html`) with Dart Sass.
  `assets/styles/style.scss` is run through Hugo's template engine (that is how
  breakpoints from `[params.breakpoints]` reach Sass); no other partial is. Use the
  module system (`@use`), BEM class names, and colour/font tokens from
  `_colors.scss` / `_fonts.scss` (`var(--color-mint)`, …).
- **PurgeCSS** runs on every build and only sees class names in `layouts/`,
  `assets/scripts/`, and `class="…"` / `extraClass="…"` in content and data. Write full
  class names in templates — `card-grid--{{ .cols }}` is invisible to it and the rule
  gets purged (see `partials/card-grid.html` for the pattern).
- **Themes**: light and dark, following `prefers-color-scheme`; the footer toggle stores
  an override in `localStorage` and sets `data-theme` on `<html>`
  (`partials/base/theme-init.html` applies it before first paint — inline, keep it ES5).
  Components use only the semantic tokens in `_colors.scss` (`--bg`, `--fg`, `--accent`, …),
  never raw brand colours, so both themes keep working.
- **YouTube**: use `{{</* youtube-lite id="…" title="…" poster="/media/uploads/…" */>}}`,
  which loads nothing from YouTube until play is pressed (the cookies page says so).
- **Template lookup** (Hugo ≥ 0.146): the artist page template must live at
  `layouts/artists/term.html`; in `_default/` it loses to `_default/list.html`.
- `postcss-cli` looks unused but is required: Hugo's `postCSS` pipe shells out to it.
- **Look** ("Plc zine", from KRDM's own flyers): paper and ink, flyer green as the only
  highlight, square corners, hard rules, black-and-white artist photos. Avoid soft
  "card UI" (rounded corners, translucent panels, gentle shadows/borders).
- **Fonts** are self-hosted WOFF2 in `static/fonts/` (latin + latin-ext): Courier Prime
  (body), Amatic SC (hand-lettered headings), Special Elite (typewriter small print).
  Don't reintroduce Google Fonts (GDPR). The logo is the hand-drawn mark in
  `static/media/brand/krdm-mark-white.png` (inverted by CSS on the light theme).
- **Icons** are Feather SVGs in `assets/icons/`, inlined with `{{ partial "icon" "name" }}`.
- **JS** is vanilla ES modules in `assets/scripts/`, bundled in
  `layouts/partials/base/scripts.html` (add new files to the slice there). JavaScript
  Standard Style (no semicolons, single quotes, space before function parens).
  `layouts/partials/base/unsupported-browser.html` holds an inline **ES5** script —
  keep it ES5; ESLint doesn't see inline scripts.

## SEO / GEO (search and LLM discoverability)

Keep these working when you touch templates:

- `layouts/partials/head/seo.html`: title, meta description
  (`partials/func/description.html`), canonical, `hreflang` + `x-default`, Open
  Graph/Twitter, and `noindex` on every non-production `CONTEXT`.
- `layouts/partials/head/schema.html`: JSON-LD `@graph` with `NGO` (organisation) and
  `WebSite` nodes on every page, `WebPage` + `BreadcrumbList`, and per type
  `MusicEvent`, `MusicAlbum`, `Product` (merch) or `MusicGroup` (with `sameAs` links
  pulled from the bio).
- `layouts/index.llms.txt` → `/llms.txt` and `/en/llms.txt` (llmstxt.org): a Markdown
  map of the site for LLMs. New sections should be listed there too.
- `layouts/robots.txt`: allows all crawlers (including AI crawlers) on production,
  disallows everything on previews; points to the sitemap index.
- Every page must have exactly one `<h1>`, real link text, and `alt` on images.

## Deployment

`bin/build.sh` branches on Netlify's `CONTEXT`: production builds with `--minify -b
$URL`, previews with `-b $DEPLOY_PRIME_URL`. Both `sed` the branch into
`static/admin/config.yml`'s `__BRANCH__` placeholder — **never commit a real branch
name there**. Only `HUGO_*` and `CONTEXT` env vars are readable from templates.
`.github/workflows/daily-rebuild.yml` triggers a production build every morning
through a Netlify build hook (repo secret `NETLIFY_BUILD_HOOK`), because events move
from upcoming to past only when the site is rebuilt.
`HUGO_VERSION` in `netlify.toml` is the only pinned version; bump it only after a
local build at that exact version. Node is not pinned (Netlify's image supplies it).
Response headers live in `static/_headers` (read by Netlify and Cloudflare alike).

**Moving to Cloudflare Workers (in progress, 2026-11).** The site is also deployed,
as a static-assets-only Worker `krdm-www` in the shared "KRDM" Cloudflare account
(`wrangler.jsonc`), by `.github/workflows/deploy.yml`: main to
https://krdm-www.krdm.workers.dev, other branches to
`https://<branch>-krdm-www.krdm.workers.dev`. Until krdm.si's DNS moves to
Cloudflare, Netlify stays production and every Workers build is a preview (noindex).
`bin/workers-redirects.sh` adapts the Netlify `_redirects` after the build (`301!` →
`301`, drops the `404` rules; `404-page` handling serves `/en/404.html` instead) —
keep new redirects in plain `from to 301` form. Before the cutover: the contact and
order forms need a replacement for Netlify Forms (they don't work on Workers), the
Turbo admin URLs need the workers.dev addresses, then main switches to
`CONTEXT=production`, `daily-rebuild.yml` dispatches the deploy workflow, and Netlify
is retired. Until then every push to main deploys on both platforms, so keep changes
working on both. The repo lives in the `krdmplc` GitHub org (since 2026-11-23), whose
Netlify and Decap Turbo GitHub Apps are installed there. The workflow needs the repo
secret `CLOUDFLARE_API_TOKEN` (an account-owned token, Workers Scripts: Edit on the
KRDM account).

Decap CMS loads unpinned from a CDN in `static/admin/index.html` (`^3.0.0`, i.e. the
latest 3.x; the Turbo backend needs 3.17.0 or newer); an `/admin/` breakage with no
matching commit is usually an upstream release.

**CMS sign-in is Decap Turbo** (`backend: turbo-github` with the site's
`turbo_site_id`), not Netlify Identity. Editors, their roles (per-collection access)
and the GitHub App connection are managed on the site's page at
https://turbo.decapcms.org/sites/25133a11-73f6-45c9-bfff-fe114aec023d. The repo
comes from the Turbo site; `config.yml` only names the branch. The site's admin
URLs in Turbo must cover `/admin/` on production and on deploy previews, or sign-in
is refused there. Planned: "Login with Plc" (plc.krdm.si accounts via Turbo SAML
SSO) — see `docs/cms-plc-sso-plan.md`.

## Privacy

The site sets **no cookies**, so there is no consent banner. Visits are counted by
**Cloudflare Web Analytics** (cookieless, nothing stored in the browser):
`partials/head/analytics.html` adds the beacon on production builds only, when
`cloudflareAnalyticsToken` in `hugo.toml` is set — on Netlify now, on Workers after the
cutover. Keep Cloudflare's automatic injection off for the zone, or visits count twice.
The cookies page describes it. YouTube embeds use
privacy-enhanced mode (`[privacy.youtube]` in `hugo.toml`). If you add analytics or
third-party embeds, update `content/cookies.*.md` and reconsider a consent banner.
The contact and order forms store submissions with Netlify Forms, and the cart sits in
localStorage; the privacy page says so.

## Housekeeping

- Don't commit `public/`, `resources/`, `node_modules/` or `.hugo_build.lock`.
- User-facing strings in templates go in `i18n/sl.toml` **and** `i18n/en.toml`.
- Content is written by volunteers in Slovenian first; keep their voice when editing.
- Commit and push only to your own branch; the PR is the hand-off.
