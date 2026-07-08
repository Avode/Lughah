# Lughah — PMF Website

Static marketing site for **Lughah** (lughah.com.my), an Arabic learning platform for Malaysians.
Plain HTML, CSS and vanilla JavaScript — no build tools, no framework, no backend.

## File structure

```
/lughah-site
  index.html        Homepage (hero A/B test, tracks, roadmap, tutors, offer, FAQ)
  quiz.html         Arabic Goal Quiz (7 steps, saves answers to localStorage)
  programmes.html   Four programme cards with outcomes
  early-bird.html   RM99 conversion page with beta pricing + Stripe checkout
  thank-you.html    Post-payment confirmation + next steps
  styles.css        Shared design system (cream / deep green / warm gold / charcoal)
  script.js         Shared JS: config, i18n (EN/BM), A/B test, quiz engine, tracking
  README.md         This file
```

## Run locally

No build step. Either open `index.html` directly in a browser, or serve the folder
(recommended, so navigation and localStorage behave exactly like production):

```bash
# Python (preinstalled on macOS/Linux)
cd lughah-site
python3 -m http.server 8000
# → http://localhost:8000

# or Node
npx serve lughah-site
```

## Deploy to Cloudflare Pages

**Option A — drag and drop (fastest)**
1. Go to Cloudflare Dashboard → **Workers & Pages → Create → Pages → Upload assets**.
2. Drag the `lughah-site` folder in. Done — you get a `*.pages.dev` URL.

**Option B — Git integration (recommended for ongoing changes)**
1. Push this folder to a GitHub repository.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/` (or `lughah-site` if the folder is nested in the repo)
4. Add the custom domain **lughah.com.my** under the project's **Custom domains** tab.

## Things to replace before launch

### 1. Stripe Payment Link
Edit **one line** in `script.js`:

```js
stripeUrl: "https://buy.stripe.com/test_lughah_earlybird",
```

`script.js` rewrites every checkout button (`a[data-stripe-link]`) from this value at
page load, and appends `client_reference_id=lughah_variant_X` so the A/B variant shows
up on the Stripe payment record. The same placeholder URL is also hardcoded as a no-JS
fallback in `early-bird.html` — search for `buy.stripe.com` and replace there too.

> In your Stripe Payment Link settings, set the **confirmation page** to
> `https://lughah.com.my/thank-you.html` so buyers land on the thank-you page
> (which fires the `early_bird_conversion` tracking event).

### 2. WhatsApp Business number
Edit `script.js`:

```js
whatsappNumber: "60123456789",
whatsappBaseText: "Hi Lughah, I am interested in Arabic classes",
```

All WhatsApp buttons (`a[data-wa-link]`) are rewritten from this config. The placeholder
`wa.me/60123456789` URL is also hardcoded as a no-JS fallback in each HTML file — search
for `wa.me/60123456789` and replace.

### 3. Analytics IDs
Each HTML file's `<head>` contains two clearly-marked commented blocks:

- **GOOGLE ANALYTICS (GA4)** — uncomment and replace `G-XXXXXXXXXX`.
- **META PIXEL** — uncomment and replace `YOUR_PIXEL_ID`.

Once installed, all custom events fire automatically through the `track()` helper in
`script.js` — no further wiring needed. Events emitted:

| Event | Fires when |
|---|---|
| `ab_variant_assigned` | first visit, variant A/B/C assigned |
| `ab_hero_impression` | homepage hero rendered |
| `quiz_start` / `quiz_complete` | quiz opened / finished (with recommendation) |
| `checkout_click` | any Stripe button clicked |
| `whatsapp_click` | any WhatsApp button clicked |
| `language_switched` | EN ↔ BM toggle used |
| `early_bird_conversion` | thank-you.html loads after payment |

### 4. Contact email
`hello@lughah.com.my` appears in each footer — confirm the mailbox exists or replace it.

## How the A/B test works

`script.js` randomly assigns each new visitor one of three hero headlines (A/B/C),
stores it in `localStorage` (`lughah_ab_variant`), logs it to the console, and appends
it to CTA links (`early-bird.html?variant=A`) plus the Stripe `client_reference_id`.
Returning visitors always see their original variant. Edit the copy in `AB_VARIANTS`
at the top of `script.js`.

## Language toggle (EN / BM)

English is the default. The floating EN/BM button (bottom-right, every page) swaps all
text carrying a `data-ms="…"` attribute, and the choice persists in `localStorage`
(`lughah_lang`). To edit Malay copy, edit the `data-ms` attributes in the HTML (and the
`ms:` strings inside `script.js` for quiz content).

## Quiz data

Answers are saved to `localStorage` under `lughah_quiz_answers` (answers, recommendation,
variant, timestamp). During beta you can ask interested users to screenshot or read
their answers over WhatsApp; a backend can replace this later.

## Copy points to confirm before launch

These reasonable defaults were written into the copy — confirm they match your policy:

- **Refund rule** (early-bird.html FAQ): RM99 refunded in full if a track's beta intake
  doesn't open, or the reservation moves to another intake/track.
- **Response time**: WhatsApp confirmation "within 1 working day".
- **Pricing note**: final fee within the published range is confirmed at placement.
