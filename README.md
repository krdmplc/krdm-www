[![Netlify Status](https://api.netlify.com/api/v1/badges/75126d26-6924-4999-a194-9e75a3d94f49/deploy-status)](https://app.netlify.com/sites/krdm-www/deploys)

# krdm.si

Website of Društvo KRDM — <https://www.krdm.si/>. Slovenian at `/`, English at `/en/`.

Built with [Hugo](https://gohugo.io/), hosted on [Netlify](https://www.netlify.com),
edited with [Decap CMS](https://decapcms.org/) at <https://www.krdm.si/admin/>.

Working on the code (with or without an AI agent)? Read [AGENTS.md](AGENTS.md) first.

## Getting started

You need [Hugo extended](https://gohugo.io/installation/) (the version in
[netlify.toml](netlify.toml)) and Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open <http://localhost:1313/>. To use the CMS locally, run `npx decap-server` in a
second terminal and open <http://localhost:1313/admin/>.

This repository is set up for [Visual Studio Code](https://code.visualstudio.com/);
install the recommended extensions from [.vscode/extensions.json](.vscode/extensions.json).

## Development

- CSS class names follow [BEM](https://getbem.com/); JavaScript follows the standard style.
- `npm run lint` runs ESLint and Stylelint (Netlify runs it before every build). A
  pre-commit hook (Husky + lint-staged) fixes what it can on staged files.
- Images uploaded through the CMS go to `static/media/uploads/` and are resized to
  WebP at build time — upload the original, not a pre-shrunk copy.

## Deployment

Pushing to `main` deploys to production. Pull requests get a deploy preview, which is
hidden from search engines.

## Dependencies

**Last updated:** November 2026 — Hugo 0.169.0 and current npm dependencies, following
[hugo-template](https://github.com/poslovnimediji/hugo-template).

`npm audit` reports a high-severity ReDoS advisory in `picomatch` (≤ 4.0.7,
GHSA-fc5q-39xc-vjpf), reached through ESLint, Stylelint, PurgeCSS and postcss-cli. No
patched version exists yet; it only runs at lint/build time on the repository's own
glob patterns. Re-check with `npm audit` on the next update.

Update by hand: `npm outdated` / `npm audit`, then `npm run lint` and a build. Bump
`HUGO_VERSION` in `netlify.toml` only after a local build at that exact version.
