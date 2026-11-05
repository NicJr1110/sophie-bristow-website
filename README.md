# Sophie Bristow – website

Gallery and shop for Sophie Bristow's tattoo flash, mark making and original artwork.
Full specification: [Sophie Bristow Website – Specification](https://claude.ai/artifact/X36dXtCs22pJLP3pB7cYZs).

| Part | Tech | Cost |
| --- | --- | --- |
| Site | Astro, fully static (`src/`) | free |
| Server logic | Cloudflare Pages Functions (`functions/api/`, shared code in `server/`) | free tier |
| CMS | Sanity Studio (`studio/`) | free plan |
| Payments | Stripe Checkout (hosted) | 1.5% + 20p per UK card |
| Email | Resend | free (3,000/month, 100/day) |

The functions call Sanity, Stripe and Resend with plain `fetch`, so they need no npm packages.

## Run it now (no accounts needed)

```bash
npm install
npm run dev        # http://localhost:4321, uses placeholder content and images
```

With `PUBLIC_SANITY_PROJECT_ID` blank, every page renders with sample content, so you can work on layout and design straight away.

## Pages

| URL | What |
| --- | --- |
| `/` | Name at the top, menu buttons centred. No header menu. |
| `/flash/`, `/mark-making/` | Shared gallery template (`src/components/GalleryPage.astro`) |
| `/artwork/` | Same grid plus Buy buttons; live sold status from `/api/status` |
| `/bio/` | Photo on top, rich text below |
| `/contact/` | Name, email, message, plus a honeypot |
| `/thank-you/`, `/checkout-cancelled/` | Stripe return pages |

Breakpoints: small < 768px (2 columns, burger), medium 768–1023px (3 columns, burger), large ≥ 1024px (3 columns, horizontal menu, 880px central channel). Styling is placeholder: swap the tokens at the top of `src/styles/global.css` when the design guidelines come back.

## API

| Endpoint | Does |
| --- | --- |
| `POST /api/checkout` | Checks the piece is free, reserves it for 31 min (atomic via Sanity `ifRevisionID`), creates a Stripe Checkout session that expires at the same time |
| `POST /api/stripe-webhook` | Verifies the signature. `completed` → mark sold + email Sophie the order. `expired` → back to available |
| `POST /api/release` | From the cancel page: expires the Stripe session and frees the piece immediately |
| `GET /api/status` | `{ id: "available" \| "sold" }`, uncached (reserved shows as sold) |
| `POST /api/contact` | Validates (all fields + enquiry type required), rate-limits, emails Sophie (reply-to = sender), then sends the auto-reply template mapped to the chosen enquiry type (or the away message) |

## Setting up the services

### 1. Sanity

You can practise on your own Sanity project and switch to Sophie's later. That's just the project ID env vars. Or keep the project and invite her as Administrator.

```bash
cd studio
npm install
npx sanity login
npx sanity init --env      # or create a project at sanity.io/manage and copy the ID into studio/.env
npm run dev                # Studio at http://localhost:3333
npm run deploy             # hosts it at https://sophie-bristow.sanity.studio
```

At sanity.io/manage:
- Dataset **production**, visibility **public**. The site reads published content at build time.
- **API → Tokens**: create an **Editor** token and set it as `SANITY_WRITE_TOKEN`. Only the server functions get it.
- **API → CORS origins**: add `http://localhost:3333` and the deployed studio URL.
- In the Studio, open each item in the sidebar once and publish it (Flash, Mark Making, Artwork page intro, Bio, Site settings).
- Under **Contact form**, create email templates first (e.g. "Tattoo reply", "General reply"), then enquiry types ("Tattoo" order 1, "Other" order 2), each pointing at a template. Two types can share one template. Enquiry types show on the form after the next site build.

### 2. Stripe (Sophie's account, Nic as Developer)

1. Test mode first. Under **Developers → API keys**, create a **restricted key** with Checkout Sessions: write. Set it as `STRIPE_SECRET_KEY`.
2. Under **Developers → Webhooks**, add an endpoint at `https://<site>/api/stripe-webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Locally: `stripe listen --forward-to localhost:8788/api/stripe-webhook`.
4. Test with card `4242 4242 4242 4242`. Repeat steps 1–2 in live mode when ready.

### 3. Resend

Verify Sophie's domain (DNS records in Cloudflare), create an API key and set it as `RESEND_API_KEY`. Set `EMAIL_FROM` to an address on that domain. The auto-reply goes to strangers, so the domain **must** be verified.

### 4. Cloudflare Pages

- Connect this repo. Build command `npm run build`, output `dist`.
- Add every variable from `.env.example` under Settings → Variables and Secrets.
- Optional: create a KV namespace, bind it as `RATE_LIMIT`, and the contact form limits to 5 per IP per hour.
- Add a **Deploy Hook** and paste it into a Sanity webhook (sanity.io/manage → API → Webhooks) so publishing in the Studio rebuilds the site. Sold status doesn't need this, because it's live.

### Coming-soon mode (launch switch)

Sanity → **Site settings → Coming soon**. When it's on, every page shows a holding page (name, message, Instagram link) and `/api/*` keeps working. `functions/_middleware.ts` checks the switch live, with a ~30s cache, so turning it off goes live **without a deploy**. If Sanity can't be reached, it fails open and shows the real site.

- Sophie previews the real site by opening `https://<site>/?preview=<preview key>` once per device (cookie, 30 days). `?preview=off` exits. Changing the key revokes old links.
- New docs default to **on**. Set `SANITY_STUDIO_SITE_URL` in `studio/.env` so the Studio shows the full preview link.
- Content edits still need a rebuild to appear, so set up the Sanity → Cloudflare deploy hook (above) before handover.
- `public/_routes.json` keeps static assets out of the middleware, to save free-tier function calls.

### Full local test with functions

```bash
cp .env.example .dev.vars   # fill in
npm run preview             # builds, then wrangler serves site + functions on :8788
```

## Tests

```bash
npm test   # webhook signature check, Stripe encoding, reservation logic, rich-text escaping
```
