# Workanetics.com

Single-page static site for Workanetics — billing platform migrations.

## Structure
- `index.html` — the entire site (self-contained: styles, script, form)

## Environments (Cloudflare Pages)

| Environment | Git branch | URL |
|---|---|---|
| Production | `main` | https://workanetics.com |
| Staging | `staging` | https://staging.workanetics.com |

## One-time setup

1. Push this folder to a GitHub repo (e.g. `workanetics-site`) with branches `main` and `staging`.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** → select the repo.
   - Production branch: `main`
   - Build command: (none) · Output directory: `/`
3. Custom domains tab → add `workanetics.com` and `www.workanetics.com` (auto-configured since the zone is in this account).
4. Staging URL: every branch gets a stable alias at `staging.<project>.pages.dev`.
   To use `staging.workanetics.com`, add a DNS CNAME:
   `staging` → `staging.<project>.pages.dev` (proxied).

## Workflow

- Edit on `staging` branch → push → auto-deploys to the staging URL.
- Verify → merge/PR `staging` into `main` → auto-deploys to workanetics.com.
- Rollbacks: Pages dashboard → Deployments → "Rollback to this deployment."

## Notes

- Preview/staging deployments are automatically sent with `X-Robots-Tag: noindex`, so staging won't appear in Google.
- Before launch: replace `CONTACT_EMAIL` in index.html with the real inbox (set up free Cloudflare Email Routing for hello@workanetics.com).
