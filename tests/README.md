# Workanetics test suite

Two layers:

## 1. Smoke test (no dependencies — just curl)
Checks availability, content, form fields, meta tags, and assets.

    ./tests/smoke.sh                                # pages.dev
    ./tests/smoke.sh https://workanetics.com        # production (adds www + index checks)
    ./tests/smoke.sh https://staging.workanetics.pages.dev

Exit code 0 = all passed. Run against staging before every merge to main.

## 2. Browser tests (Playwright)
Covers form validation, mailto assembly, anchors, mobile layout, console errors.

One-time setup (Fedora):

    cd ~/Projects/workanetics
    npm init -y
    npm install -D @playwright/test
    npx playwright install chromium

Run:

    BASE_URL=https://workanetics.pages.dev npx playwright test --config tests/playwright.config.js
    BASE_URL=https://workanetics.com       npx playwright test --config tests/playwright.config.js

Add `node_modules/` and `package-lock.json` handling to .gitignore
(Cloudflare Pages doesn't need them — the site has no build step).
