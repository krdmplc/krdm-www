# AGENTS.md

Guidance for AI coding agents (and humans) working on **krdm.si**, the bilingual
website of Društvo KRDM, a non-profit music association from Kranj, Slovenia.

Stack: **Hugo** (static site) → **Netlify** (build/host, `main` = production) →
**Decap CMS** at `/admin/` (Netlify Identity + git-gateway). Seeded from
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

## Content model

Two languages: **`sl` (default, served at `/`)** and **`en` (`/en/`)**. Every content
file exists as `name.sl.md` + `name.en.md`.

| What | Files | URL (sl / en) |
|---|---|---|
| Events | `content/events/<name>.<lang>.md` | `/dogodki/<name>/` · `/en/events/<name>/` |
| Releases | `content/releases/<name>.<lang>.md` | `/izdaje/<name>/` · `/en/releases/<name>/` |
| Artists | `content/artists/<ref>/_index.<lang>.md` | `/ustvarjalci/<slug>/` · `/en/artists/<ref>/` |
| Pages | `content/{about,join,play,cookies}.<lang>.md` | Slovenian `slug` in front matter |
| Home | `content/_index.<lang>.md` | `/` · `/en/` |

- **Artists are taxonomy terms**, not a section (`[taxonomies] artist = "artists"`).
  Events and releases list them in `artists: [ref, …]`; templates resolve them with
  `.GetTerms "artists"`. An artist's `ref` **must equal its folder name**, otherwise
  Hugo creates an empty term page. `static/admin/index.js` keeps them in sync on save.
- Front matter fields: `title`, `description` (meta description — optional, a good
  one is generated otherwise), `thumbnail` (`/media/uploads/…`), events: `startDate`,
  `endDate`, `venue` (`"Venue, Town"`; the part after the comma becomes the
  locality in JSON-LD), `price` (`"8 €"`); releases: `releaseDate`.
- Events have `series` (`distorzn`, `plc-fest`, `plesen`, `other`) for the filter on
  the events page. Artists have `status` (`active` default, `hiatus`, `inactive`),
  `featured: true` (pinned first) and `hideOnHome: true` (no longer with KRDM). The
  home page shows only active, non-hidden artists, ordered by latest release/event.
  **Status is not shown publicly** — inactive artists just sort last on the artists page.
- There is **no public email address** (info@krdm.si is dead): contact goes through
  the Netlify Forms form on `content/contact.*.md` (`{{</* contact-form */>}}`), whose
  notifications are configured in the Netlify UI. Prices appear only on event pages,
  never in listings.
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
  `MusicEvent`, `MusicAlbum` or `MusicGroup` (with `sameAs` links pulled from the bio).
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
`HUGO_VERSION` in `netlify.toml` is the only pinned version; bump it only after a
local build at that exact version. Node is not pinned (Netlify's image supplies it).

Decap CMS and the Netlify Identity widget load unpinned from CDNs in
`static/admin/index.html`; an `/admin/` breakage with no matching commit is usually
an upstream release.

## Privacy

The site sets **no cookies** and has no analytics (the old Universal Analytics tag
was dead and was removed), so there is no consent banner. YouTube embeds use
privacy-enhanced mode (`[privacy.youtube]` in `hugo.toml`). If you add analytics or
third-party embeds, update `content/cookies.*.md` and reconsider a consent banner.
The contact form stores submissions with Netlify Forms; the privacy page says so.

## Housekeeping

- Don't commit `public/`, `resources/`, `node_modules/` or `.hugo_build.lock`.
- User-facing strings in templates go in `i18n/sl.toml` **and** `i18n/en.toml`.
- Content is written by volunteers in Slovenian first; keep their voice when editing.
- Don't commit or push unless asked.
