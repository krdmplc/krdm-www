# Plan: "Login with Plc" for the CMS

Status: planned on 2026-11-22, not started. Work happens in three other repos;
this repo only changes at the end (step 6).

Goal: editors sign in to the CMS at https://www.krdm.si/admin/ with their
plc.krdm.si account ("Space HQ", repo
[AlesJelovcan/pi-network-report](https://github.com/AlesJelovcan/pi-network-report)),
so KRDM has one set of accounts for both.

## Decisions

These are settled; the agent prompts below repeat them so the agents don't
revisit them.

- **The CMS stays on Decap Turbo** (sign-in, GitHub proxy, roles). Turbo site:
  `25133a11-73f6-45c9-bfff-fe114aec023d`.
- **Single sign-on uses Supabase's SAML SSO, with plc.krdm.si as the login
  provider (identity provider).** Not Supabase's custom OIDC providers: those
  apply to the whole Turbo project and merge accounts by verified email. Most
  Plc accounts are Gmail addresses that may already have Turbo accounts (staff
  ones included), so plc.krdm.si could take them over. SAML SSO accounts are
  never merged, and the session records which provider signed the person in
  (`amr[0].provider` in the JWT), which gives Turbo a boundary between orgs.
- **The provider is found from the site, never from the email domain.** The
  CMS already sends `site_id` to Turbo; Turbo looks up the site's org and the
  org's provider. Supabase refuses public domains like gmail.com anyway.
- **Plc accounts are separate Turbo accounts.** They are never merged with
  other Turbo accounts, even when the email matches. Each belongs only to the
  org that owns its provider. The account is created on first login, with the
  role sent by Plc. No invitations.
- **plc.krdm.si decides who gets in.** Each account gets a website role:
  none, `editor` or `admin`. When it is removed or the account is disabled,
  CMS access ends within 24 hours.
- **The CMS button says "Login with Plc", and Turbo's login page is
  skipped.** A link to the other sign-in methods stays, so org owners can
  still get in if plc.krdm.si is down.
- **Contract between Turbo and Decap:**
  - Turbo's config response (`/functions/v1/config?site_id=…`) gains an
    optional `login_label` field.
  - `/auth/decap-redirect?site_id=…` forwards straight to the site's
    provider.
  - Nothing else about the login popup changes.

### Rejected: no Turbo at all

Decap's bundle has an `aws-cognito-github-proxy` backend (OAuth 2 with PKCE
against any provider, plus a GitHub proxy at `api_root`). It would work with no
Decap changes. It was rejected because the proxy holds write access to this
repo and would have to live in the volunteer-run PHP app (or a new Worker),
instead of in a service we already run and secure.

## Steps

| # | Who | What | Depends on |
|---|---|---|---|
| 0 | Martin | Turn on **SAML 2.0** in Auth → Providers on **both** Turbo Supabase projects (`pujtvbcombndovjjlsmz` and `ioltadnfuvnndhbzbagl`); it needs the Pro plan. It was off on 2026-11-22 (`saml_provider_disabled`). Get Aleš to agree to the plc.krdm.si work. | — |
| 1 | Turbo agent | Build the server side on `develop`, tested against a mock login provider | 0 |
| 2 | Decap agent | Show "Login with {login_label}" on the CMS login screen | — (contract fixed above) |
| 3 | plc.krdm.si agent | Make plc.krdm.si a SAML login provider and add the website role per account, developed locally | Aleš's agreement |
| 4 | Martin + agents | Connect them on `develop`: register a local plc.krdm.si there and test with decap-cms-tester. SAML goes through the browser, so a plc.krdm.si running on localhost works. | 1, 2, 3 |
| 5 | Martin, Aleš | Release: apply Turbo migrations to both projects and merge to `main`; release Decap; Aleš deploys plc.krdm.si with its signing key. Then register plc.krdm.si on production, link the KRDM org, set website roles in plc.krdm.si, and test at www.krdm.si/admin/. | 4 |
| 6 | This repo | Update the CMS sign-in paragraph in `AGENTS.md`; switch off Netlify Identity and Git Gateway in Netlify; mark this plan done | 5 |

No change to `static/admin/config.yml` is needed: the label comes from Turbo,
and the site loads Decap `^3.0.0`, so it picks up the new button when Decap is
released.

## Agent prompts

### 1. Turbo (`decap-turbo`)

```text
Build per-org single sign-on (SSO) for Turbo on Supabase SAML SSO. The first
customer is the KRDM org. Its editors will sign in to the CMS at
www.krdm.si/admin/ (Turbo site 25133a11-73f6-45c9-bfff-fe114aec023d) with their
plc.krdm.si accounts. A separate session is making plc.krdm.si a SAML login
provider, and another is adding the CMS button in decap-cms. Build and test
this side on develop against a mock login provider (e.g. mocksaml.com, or a
metadata file).

Decisions already made. Don't revisit them; flag a real blocker instead.
- SAML SSO, not custom OIDC providers. Custom OIDC providers apply to the
  whole project and merge accounts by verified email. KRDM's accounts are
  mostly gmail.com, so a weak login provider could take over existing Turbo
  accounts, including staff ones. SAML SSO accounts are never merged, and
  the JWT carries the provider UUID (amr[0].provider).
- Find the provider by site_id → org → connection. Never register email
  domains on a connection (Supabase blocks public domains anyway).
- SSO accounts are separate accounts, created on first login, and confined to
  the org that owns their provider.
- SAML 2.0 is being enabled on both refs (it was off on 2026-11-22). Check
  that it is on before you rely on it.

Current state: Decap's popup opens
/auth/decap-redirect?redirect_to=…&site_id=…
(decap-cms packages/decap-cms-lib-turbo/src/AuthenticationPage.js,
getTurboLoginUrl). The login buttons come from astro/src/lib/auth-providers.ts.
The CMS fetches the config function before sign-in; its response is merged
into the backend config. There is no SSO code yet; docs/pricing-matrix.md lists
SSO/SAML as roadmap.

Scope:
1. Schema (additive only): an SSO connection per org with
   - the Supabase sso_provider_id and the button label (e.g. "Plc");
   - whether CMS sign-in forwards straight to the provider;
   - a mapping from the SAML attribute `website_role` (values: editor, admin)
     to the org's Turbo site roles, per site.
   Follow CLAUDE.md on grants, revoking both ways, RLS tests, and applying
   migrations to BOTH refs before pushing functions that use them.
2. Contract with the Decap client (fixed; a decap-cms session builds against it):
   - The config function returns an optional `login_label` (string) for a site
     whose org has a connection that forwards. It is absent otherwise.
   - /auth/decap-redirect?site_id=… for such a site immediately calls
     signInWithSSO({ providerId }) through the existing callback/exchange flow.
     No Turbo login page is shown.
   - "Use another sign-in method" leads back to the normal login, so org owners
     can still get in if the provider is down. The existing site-membership
     check still applies.
   - The generic /login page never shows any org's SSO button.
3. First login and every later login (plc.krdm.si is the source of truth):
   - Create or update the account's membership in the owning org, and in the
     requested site, with the role mapped from website_role.
   - A missing or unknown website_role means no access, with a clear message,
     and any existing membership is removed.
4. Tenant boundary, enforced server-side (RLS restrictive policies or
   membership checks on amr[0].provider), with RLS tests. An SSO account can
   never:
   - be a member of, be invited to, or see another org;
   - create an org;
   - accept an invitation;
   - be matched by an email lookup from a non-SSO path, or the reverse.
   Emails are not unique any more: audit every lookup by email (invitations,
   add-member, member lists, backoffice, emails).
5. SSO accounts get no product, onboarding or funnel emails and no
   "how did you hear about us" step. We are the processor for these editors.
   They don't need the Turbo dashboard; decide whether to block it.
6. Removing access: an account disabled or stripped of website_role in
   plc.krdm.si must lose CMS access within 24 hours. SAML has no remote
   sign-out. Pick a mechanism (session age from amr in the proxy/permissions
   path, a Supabase session time-box, …) and document it.
7. Staff setup: document, or add to the backoffice, how to register a SAML
   connection and link it to an org:
   - supabase sso add with metadata URL or file, attribute mapping for
     email, name, website_role, and no domains;
   - on which ref;
   - how to rotate the provider's certificate.
   Also state the exact service-provider entity ID and ACS URL for both refs
   (from https://<ref>.supabase.co/auth/v1/sso/saml/metadata). The
   plc.krdm.si side needs them.

Start with a short plan in docs/ and check the open questions with me before
writing migrations. Change the server first and keep it backwards compatible
(pinned clients never update).
```

### 2. Decap (`decap-cms`)

```text
A small Turbo client change on main: the CMS login button shows the site's
own sign-in provider ("Login with Plc") when Turbo provides one.

Contract (fixed; decap-turbo is adding the server side):
- Turbo's config function, which the turbo backends fetch before sign-in
  (preloadConfig) and merge into the backend config, may return an optional
  `login_label` string, e.g. "Plc".
- The popup URL does not change. Turbo's /auth/decap-redirect?site_id=…
  forwards straight to the provider on its own.

Scope:
- packages/decap-cms-lib-turbo/src/AuthenticationPage.js: when login_label is
  set, the button reads "Login with {label}" through a locale string with a
  placeholder (English text; other locales fall back). Otherwise it stays
  exactly as it is now.
- Check that the merged config really exposes login_label to the page for
  both turbo-github and turbo-gitlab. Trace preloadConfig rather than
  assuming.
- Backwards compatible both ways: an old Turbo server (no field) and old
  clients (ignore the field) must keep working.
- Unit test for both states. Verify in decap-cms-tester (decap-tester skill)
  once Turbo develop returns the field for a test site.
```

### 3. plc.krdm.si (`pi-network-report`)

```text
Goal: make plc.krdm.si (Space HQ) a SAML 2.0 login provider, so that its
accounts can sign in to the KRDM website CMS through Decap Turbo (Turbo uses
Supabase's SAML SSO). The Turbo and Decap sides are being built in other
sessions.

Ground rules from this repo:
- CLAUDE.md lists KRDM as "Not for now", so first draft this as a GitHub
  issue (label `app`) for the owner to approve, and assign yourself per the
  roadmap rules.
- Never touch the hub host; the owner deploys.
- The local checkout is on an old branch (roadmap-page, 2026-10-14). Fetch
  and branch from the current default first.

What to build:
1. A per-account "website role" (none / editor / admin) that only admins can
   set, shown on the account page. Accounts with none, and disabled accounts,
   are refused.
2. Trusted service providers in settings: a list of entries, each with entity
   ID and ACS URL, at first Turbo develop and Turbo production. The Turbo
   session supplies the exact values (they come from
   https://<ref>.supabase.co/auth/v1/sso/saml/metadata).
3. GET /saml/metadata: this provider's EntityDescriptor with its signing
   certificate and the SingleSignOnService endpoint (HTTP-Redirect binding).
   No signed requests required.
4. /saml/sso:
   - Accept an AuthnRequest (HTTP-Redirect: base64 + DEFLATE, plus
     RelayState). Accept only a trusted service provider: the Issuer must be
     in the list, and the ACS URL (if given) must match exactly.
   - Make the user sign in with the existing login (cookie, emailed sign-in
     link, PIN). Keep the pending request server-side across the emailed-link
     round trip.
   - Then POST (auto-submitting form) a Response with a signed Assertion to
     the ACS URL:
     - RSA-SHA256 and exclusive c14n, using robrichards/xmlseclibs if adding a
       dependency is OK, or DOMDocument::C14N + openssl_sign otherwise;
     - NotBefore/NotOnOrAfter of about 5 minutes, AudienceRestriction,
       InResponseTo, Destination;
     - a persistent NameID taken from the account's stable id (not the email);
     - attributes: email, name, website_role.
   No single logout.
5. The signing key and certificate live outside the web root, and the owner
   generates them on the host. Document the openssl commands and how to
   rotate them (Turbo staff must then re-import the metadata).

Testing: Supabase receives the assertion through the browser, so a local
plc.krdm.si works against Turbo develop. Turbo staff register your metadata
as a file. Before asking for a deploy, list exactly what the owner must do on
the host.
```
