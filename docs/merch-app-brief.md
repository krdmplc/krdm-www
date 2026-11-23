# Brief: KRDM merch app

Status: brief, written 2026-11-22. Nothing built yet. Items under "Open: with
Aleš" need his agreement before they are built.

## Goal

A phone-first back office for selling KRDM's merch: at gigs (often with no
signal), from home stock, and through web orders. It holds the products, the
stock, and who holds whose money. The website stops keeping merch in
Markdown and reads everything from this app's API, the way a Snipcart shop
would.

## Who uses it

| Case | What happens in the app |
|---|---|
| A person selling at a concert | One stand, items from one owner |
| A band admin fulfilling web orders | Sees their band's orders, reserves, ships, records postage |
| The label manager | Sees all owners; manages products, stock, prices, money |
| A band selling label items at its gig | One stand, two owners: the money for label items belongs to the label |
| One seller for many bands (Plc fest) | One stand, many owners, up to 5 phones (mostly 2 at once) |

About 50 accounts in total.

Roles:

- **Label admin**: everything.
- **Band admin** (for one or more bands): that band's products, prices, stock,
  orders and money. Gives discounts, opens stands.
- **Seller**: sells at the stands they are assigned to, sees their own
  balances. Never sees purchase costs or other people's balances.

Both admin roles are kept in this app, not in the login provider (see Login).

## Decisions

- **Products live only in this app.** The website is a client of its API
  (catalog at build time, availability at runtime). The Decap `merch`
  collection goes away after a one-time import of the current
  `content/merch/*.md`.
- **Every item has exactly one owner**: a band or the label (KRDM). KRDM is
  the only label, and we don't sell other bands' merch.
- **There is no legal entity for now; the selling is personal.** The money
  belongs to the item's owner, whoever sells it. There are no commissions.
  Every sale records date, owner, seller and payment method, and everything
  can be exported, so switching to a legal entity later is a data export.
- **Variants are sizes only.** A colour is a separate product.
- **The phone app is a PWA** (installable, works offline), in Slovenian and
  English.
- **Hosting must be free at this scale.** Cloudflare Workers + D1 (SQLite)
  + R2 (photos). Keep the schema plain SQLite and the server code a thin HTTP
  API, so it can move to Bunny (Edge Scripting + Bunny Database, also
  SQLite/libSQL) or elsewhere. The stack is chosen here, not by whoever builds
  it.
- **The app takes web orders; the Netlify `order` form is retired.** The
  cart submits to the app's API, and the app's notifications send the
  emails (see "Web orders" and "Notifications"). The contact form stays on
  Netlify Forms for now.
- **Repo `krdm-merch`, address `merch.krdm.si`.** This brief moves there once
  the repo exists. The website repo keeps only the client side: catalog
  fetch, availability and checkout.
- **First phase**: selling at gigs, inventory (with locations), web orders and
  products. Reports stay simple: per event, per product, per date range.

## Concepts

### Products and prices

- Product: owner, title, description, photos, category (`apparel`, `music`,
  `other`), optional link (Bandcamp), optional release (the website's release
  file name), sizes (or none), active/archived.
- **Price tiers**: an editable list with defaults `full` (the advertised price,
  used for most sales), `friends` (a bit lower) and `band` (about the
  purchase cost). Each product has a price per tier. A stand can override
  prices for that event. The website shows `full` only.
- **Discounts**: only band and label admins can sell below `full`, by picking
  another tier or entering a manual discount with a reason. A seller's phone
  sells at `full` unless an admin has allowed a tier for that seller at that
  stand.
- **Giveaways** are sales at 0 € with a reason: stock goes down, and the cost
  shows in reports.

### Stock and locations

- **Location**: a place stock sits, held by a person. Examples: "Armaroth
  home stock" (Klemen), "label storage", "Plc", "gig box A". A location can
  hold several owners' items. A flag sets whether it counts as **available
  online** (home stock: yes; a gig box: no).
- **Stock is a sum of entries, never a stored number.** Each entry: product,
  size, quantity (+/−), location, type, and an optional unit cost. Types:
  - `received`: a (re)print run, with its unit cost, which often differs
    between runs;
  - `moved`: from one location to another (packing and unpacking a box);
  - `sold`;
  - `reserved` / `released` / `shipped`: web orders;
  - `given away`;
  - `counted`: the correction after a stock count.
- **Cost of goods uses the moving average** of `received` unit costs: simple,
  and close enough.
- **The gig box flow:**
  1. Pack: move items from home stock into a box.
  2. Sell from it.
  3. Close: count what's left, and the app records any difference as a
     correction.
  4. Move the rest back home, or keep the box packed for the next gig.
- **Box template**: a gig box (a location) can keep its standard contents,
  product × size × quantity. "Pack" fills the box up to the template, "Close"
  asks only what's missing, and the app prints the box's contents list with a
  QR code that opens the box (or its current stand) in the app. The physical
  box is described in [merch-gig-box.md](merch-gig-box.md).
- Overselling (two offline phones selling the last shirt) gives negative stock,
  which is flagged for an admin to fix. It is never a sync error.
- **Stock counts are internal.** The public API says only in stock or sold
  out, per size, the same rule the website follows today.

### Stands and sales

- **Stand**: an event (name, date, place, optionally linked to the website's
  event), its box(es), its sellers, the tiers and price overrides allowed
  there, and the change float each seller brings.
- **Sale**: items (product, size, quantity, tier, price, discount and reason),
  payment method (`cash`, `bank transfer`, `Flik`) and **who received the
  money**:
  - cash: the seller;
  - Flik or bank transfer: the account holder, picked at checkout, who may be
    another person at the stand.
- **Checkout for bank transfer shows a UPN QR code** with the amount, a
  reference (stand + sale) and the receiving person's IBAN, which they enter on
  their own profile. The customer scans it in their bank app. For Flik, it
  shows the receiving person's phone number.
- **Guardian sales**: while the band plays, someone without an account (often
  from another band) watches the stand and makes marks on the box's paper tally
  sheet. A seller at the stand enters those sales afterwards, marked as made by
  a guardian (a name, no account). The cash belongs to the seller who takes the
  cash pouch.
- **Size colours**: size buttons and labels use the same colour per size as
  the stickers and dividers in the gig box (see
  [merch-gig-box.md](merch-gig-box.md)), always with the letter as well.
- **Closing a stand**: each seller counts their cash. The app expects
  float + cash sales and shows the difference.

### Money (who holds whose money)

The design is double-entry underneath and two numbers on the phone screen.

- **Pot**: an amount of one owner's money held by someone.
  - A **person's pot**: "Klemen holds Armaroth money". It is created on
    first use, one per person per owner.
  - A **stash**: the owner's named common pot (cash box, or a band's bank
    account), with a **keeper**. A band can have more than one. Changing the
    keeper is logged.
  - **Outside pots**: customers, suppliers, payouts. These never show a
    balance.
- **Every money event is one transfer** (date, amount, owner, from pot, to pot,
  reason, link to the sale, order or stock entry, and who recorded it). A
  pot's balance is the sum of its transfers. The cases:
  - a sale: customers → the receiving person's pot;
  - a handover: Klemen's pot → Armaroth stash;
  - a reprint paid from the stash: stash → suppliers;
  - a reprint paid by Klemen himself: Klemen's pot → suppliers. His
    balance goes negative, meaning **the band owes him**, and a later stash →
    Klemen transfer settles it.
  - a payout to band members, or spending outside merch: stash → payouts.
- **A handover takes two steps**: the giver records it ("in transit"), and the
  stash keeper confirms it. Until then the money still counts as the giver's,
  so nobody's balance is ever quietly wrong.
- **On the phone**: "You hold 50 € of Armaroth money, 20 € of GMB money
  [Hand over]". A band admin sees who holds the band's money, including the
  stash.
- The change float is not owners' money and stays out of the ledger. It is
  only used when counting cash at closing.

### Web orders

- Order statuses:
  - `new` → `awaiting payment`: stock is reserved from an available-online
    location.
  - → `paid`: a transfer into the pot of the person who received the
    payment.
  - → `shipped` or `picked up`: the reservation becomes a shipment.
  - `cancelled` releases the reservation.
- **Shipping is recorded both ways**: what the customer was charged, and the
  postage actually paid (by whom). Shipping isn't any owner's money, so it is
  kept on the order, not in the owners' pots.
- One order can hold several owners' items. One person handles it and
  collects the payment, and the transfers split it per owner automatically.
- Orders can also be entered by hand (DMs, phone).
- A band admin sees orders that contain their band's items.
- **The customer gets emails too**, which Netlify Forms never sent:
  - right away: an order confirmation with the order number and items;
  - once an admin has set the shipping cost: the total and how to pay
    (amount, IBAN, reference, and the UPN QR code as an image);
  - when the order ships or is ready for pickup.

  Each email is sent from the order page with one tap and logged on the
  order.
- **The order form is guarded against spam and abuse**, which Netlify used to
  do for us:
  - a honeypot field;
  - a per-IP rate limit (a Workers rate-limiting binding);
  - prices, sizes and stock checked server-side;
  - an order-size cap.

  Add Cloudflare Turnstile only if spam gets through: it is a third-party
  script, so the privacy page would have to name it.
- **Order data is personal data** (name, email, address) kept in D1. Delete or
  anonymise the address and contact details a set time after an order is
  done (e.g. 12 months), keeping the items and amounts for the books. The
  website's privacy page must say where orders are stored.

### Notifications

- **People subscribe to topics, scoped to owners.** For example "new web
  order" (for Armaroth, or for all), "handover waiting for me",
  "negative stock" and "stand not synced 24 h after closing". Each person
  manages their own subscriptions; admins set defaults for their band.
- Every notification also appears in an in-app list. Email is the first
  delivery channel; web push to the installed PWA comes later.
- **Sending email**: an API provider with krdm.si authenticated (SPF, DKIM
  and DMARC records in krdm.si's DNS), for example Brevo's free plan, or
  Cloudflare's email sending once the DNS is on Cloudflare. The sender is a
  no-reply address. Customer emails set `Reply-To` to a monitored address of the
  order's handler, or of the label admin. Plain SMTP from a Worker is not worth
  it.

## Offline

Venues often have no signal; a stand must work for a whole night without one.

- The app shell is cached by a service worker.
- **"Prepare stand"** (online, before the gig) downloads the stand, its boxes'
  stock, products, prices, photos and the seller's permissions to the phone
  (IndexedDB).
- **Sales and stand entries are written on the phone first.** Each has an ID
  made on the phone and goes into an outbox, uploaded when there's signal.
  Uploads must be idempotent: the same sale sent twice is stored once.
- Several phones at one stand don't conflict, because stock and money are sums
  of entries. Each phone shows its own sales at once and the others' after
  they sync.
- **Editing products, prices, users and permissions needs a connection.** Only
  new entries flow from phones to the server, so there are no edit
  conflicts to resolve.
- Sessions last about 30 days per device, so a signed-in phone keeps working
  offline and through login-provider outages.
- A stand can be closed offline. The closing syncs later.

## Website

- **Build time**: Hugo fetches the catalog from the public API
  (`resources.GetRemote`) and builds the merch pages, JSON-LD `Product`,
  `llms.txt` entries and the release pages' merch lists. Photos are fetched the
  same way, so `partials/image.html` still resizes them.
- **Rebuilds**: a change to a product (not a sale) calls the site's build hook,
  debounced. The daily rebuild stays.
- **Runtime**: item pages, the merch list and the cart fetch availability with
  async JS. They show in stock or sold out per size, never counts, and fall
  back to "ask us" if the API is unreachable.
- **Orders**: `cart.js` posts the structured order (items as product id,
  size and quantity, plus the customer's details) to the app's API. The app
  checks prices and stock, assigns the order number and returns it, and the
  thank-you page (`{{</* order-done */>}}`) shows it.
  - If the API can't be reached, the cart is kept, an error says to try
    again, and the contact form is offered.
  - Retire the Netlify `order` form and its success page, and update
    `AGENTS.md` and `assets/scripts/netlify-form.js`, which then serves only
    the contact form.
- **Switch over all at once**: catalog fetch, availability and checkout go live
  together, once the app holds the imported products and stock.
- When the website leaves Netlify, the app's API can also take the contact
  form.

## Login

The goal is a shared login with the CMS and the Plc app, including people who
have no Plc membership (merch-only sellers).

Proposal: **plc.krdm.si signs people in; this app decides what they can do.**

- plc.krdm.si acts as an **OIDC** provider for this app: the Pi signs a JSON
  token with `openssl_sign`, and the Worker verifies it. This is simpler on the
  Pi than SAML, which is only needed for Turbo (because of Supabase's account
  merging; see `cms-plc-sso-plan.md`). Note: the Pi has no php-xml, which the
  SAML plan's signing routes need.
- plc.krdm.si sends only identity (a stable id, name, email) and "may use the
  merch app" (yes/no). Bands, stands and admin rights stay here, so label work
  stays decoupled from the practice space.
- **A merch-only account in Plc must not count as a member**: no fees, not in
  member lists, key holders or presence, and a "no Plc pages" landing page.
- An emailed sign-in link for the label admin as a fallback, so an outage of
  the Pi never locks everyone out.

### Open: with Aleš

- Merch-only accounts in the Plc app, and the "not a member" flag. The Plc
  repo's CLAUDE.md lists "anyone outside Plc" as not for now.
- Whether plc.krdm.si becomes an OIDC provider (and SAML for Turbo), or
  whether accounts move to a service on Cloudflare that both apps use. Moving
  them is cleaner for uptime, but takes accounts off the Pi. Expect Aleš to
  prefer keeping them there.

## Hosting and domain

- **Cloudflare free plan:**
  - Workers serves the API and the PWA;
  - D1 holds the data, with point-in-time restore;
  - R2 holds the photos, served through the Worker.
- **krdm.si's DNS is at Neoserv** (`ns59/ns60.neoserv.si`, mail on
  `mail.krdm.si`). Workers custom domains and R2 custom domains need the zone
  on Cloudflare. Options:
  The app's address is **`merch.krdm.si`**. Two ways to get it:
  1. **Move krdm.si DNS to Cloudflare** (free). Copy every record, including MX
     for `mail.krdm.si`, before switching nameservers. The site needs this
     anyway if it moves to Cloudflare. This is the preferred route.
  2. Keep DNS at Neoserv and deploy the app as a Cloudflare Pages project with
     Functions (same D1/R2 bindings). It accepts a CNAME `merch` →
     `<project>.pages.dev` from Neoserv's DNS.

  During development, use a `*.workers.dev` URL. The website only needs the
  API's base URL as a setting.

## Later, not in the first phase

- Online payment on the website.
- Richer stats (charts, stock value, margins per print run).
- Web push notifications.
- Moving the contact form off Netlify Forms.
- A legal entity: invoices, and possibly fiscal receipts (davčno potrjevanje
  računov).

## Still to decide

- **Shipping choices at checkout.** Either fixed options with prices (pickup at
  the Plc, Pošta Slovenije, …) shown in the cart, or "we'll tell you the
  shipping cost" as today.
- **Which email provider** sends the notifications.
