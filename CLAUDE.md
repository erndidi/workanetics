# CLAUDE.md — workanetics-site

## What this is

Marketing/lead-capture site for **Workanetics**, a solo consulting practice that migrates
medical billing companies and small practices between billing platforms (e.g., Kareo/Tebra,
AdvancedMD, legacy systems) without data loss. The core pitch is a **fixed price** and a
**line-by-line reconciliation report** proving zero unexplained variance (record counts,
open AR to the penny, claims history).

Audience: billing company owners and practice managers. Tone: confident, precise,
engineer-not-salesperson. The page's single job is to generate qualified inquiries for a
**paid migration assessment** (stage 1 of a two-stage, fixed-price engagement).

## Architecture

- **One file: `index.html`.** Entirely self-contained — all CSS in a `<style>` block, all JS
  in a `<script>` block at the end of `<body>`. No build step, no frameworks, no bundler,
  no external assets except Google Fonts.
- **Keep it that way.** Do not introduce a build system, npm, React, Tailwind, or split
  files unless explicitly asked. Simplicity is a feature: drag-and-drop deployable,
  zero dependencies to rot.

## Deployment

Cloudflare Pages, git-connected. No build command; output directory is `/`.

| Environment | Branch | URL |
|---|---|---|
| Production | `main` | workanetics.com (+ www) |
| Staging | `staging` | staging.workanetics.com (CNAME → branch alias `staging.<project>.pages.dev`) |

Workflow: commit to `staging` → verify at staging URL → merge to `main`.
Never commit directly to `main` for anything beyond trivial typo fixes.
Staging/preview deployments get `X-Robots-Tag: noindex` from Cloudflare automatically.
DNS and the domain both live in the same Cloudflare account.

## Design system

Defined as CSS custom properties in `:root`. Use these — do not introduce new hex values
without adding them as variables.

- `--ink` `#0F1F1B` deep forest — dark backgrounds (header, hero, process band, footer)
- `--paper` `#F6F5EE` — light page background
- `--green` `#1E8F63` / `--green-bright` `#2FBF85` — "balanced/verified." Reserved for
  proof, checkmarks, success, focus rings
- `--amber` `#F2B33D` — primary CTA color, highlights, stage badges, ticker
- `--loss` `#D5543C` — reserved exclusively for data-loss/failure content. Never use it
  decoratively
- Fonts: **Archivo** (condensed 75% width, 600–800) for display/headings/buttons,
  **Public Sans** for body, **IBM Plex Mono** for data, labels, kickers, and anything
  ledger-flavored. Tabular numerals (`font-variant-numeric: tabular-nums`) on all numbers

Signature element: the **reconciliation ledger card** in the hero (white card, slight tilt,
ghosted VERIFIED stamp, rows animating in, all variances `0 ✓`). It is the brand — protect
it in any redesign. Secondary motifs: the animated source→destination packet strip and the
amber guarantee ticker.

All animation must have a `prefers-reduced-motion: reduce` fallback (pattern already in the
file — follow it for anything new).

## The intake form

- Fields: name, email, company (opt), current platform, target platform (opt),
  timeline/trigger (opt), free-text pain points. These pre-qualify assessment leads —
  don't remove fields without asking.
- Currently backendless: JS assembles a pre-filled `mailto:` to `CONTACT_EMAIL`
  (top of the `<script>` block). **This is a placeholder** — before launch it must be set
  to the real inbox, or the handler swapped for Formspree / a Cloudflare Worker + Email
  Routing endpoint. If asked to "make the form real," prefer a Cloudflare Worker since
  DNS/email routing already live in the same account.
- **Compliance guardrail:** this site must never collect PHI. Keep the "no patient data in
  this form" note. Do not add fields requesting patient-level information. PHI is handled
  only inside engagements under a BAA — the site can say that, but must not do it.

## Content rules

- Lead with the buyer's fear (silently vanished AR / lost claims history), answer with the
  reconciliation guarantee. Every section should reinforce fixed price + proof of
  completeness.
- Claims on the page must stay deliverable: zero *unexplained* variance (not "zero
  variance" stripped of the qualifier), parallel-run period, HIPAA-compliant handling,
  reply within one business day. Don't invent testimonials, client counts, or credentials.
- No pricing numbers on the page for now (deliberate — keeps the price conversation live).
  Ask before adding any.
- US audience; plain-spoken over jargon, but billing-industry terms (AR, ERA, EOB, payer,
  timely filing) are correct and expected.

## Pre-launch checklist (current state)

- [ ] Set real `CONTACT_EMAIL` (pairs with free Cloudflare Email Routing for
      hello@workanetics.com)
- [ ] Repo pushed with `main` + `staging`; Pages project connected
- [ ] Custom domains added: workanetics.com, www.workanetics.com, staging CNAME
- [ ] Favicon + Open Graph image (not yet created)

## Related context (do not build here, but know it exists)

The owner also runs paid lead-gen for local home services (Tri-Cities, TN) and is
developing **DenialIQ**, a product for the same billing-company audience. Migration
clients are intended warm leads for DenialIQ. Keep the site standalone — no cross-links
or mentions of other ventures unless asked.
