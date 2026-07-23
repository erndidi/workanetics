// tests/inquiry-honeypot.spec.js
//
// End-to-end check of the intake form pipeline that is safe to run in CI:
// filling the honeypot field makes functions/api/inquiry.js return its
// fake-success response WITHOUT calling Resend, so no real email is ever
// sent — but the test still proves:
//   1. the deployed domain routes /api/inquiry to the Pages Function
//      (a 404 here = the domain is no longer serving the project — the
//       Worker-squatting failure mode)
//   2. the function parses the payload and honors the success contract
//      the frontend expects ({"ok":true}, HTTP 200)
//   3. the browser-side form wiring (serialization, fetch, success UI)
//      works against the real production endpoint
//
// Run:  BASE_URL=https://workanetics.com npx playwright test inquiry-honeypot
// Default (no env var): https://workanetics.com

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://workanetics.com';

// Field ids in index.html. If any id differs, fix it here once —
// every test below reads from this map.
const FIELD = {
  name: '#name',
  email: '#email',
  company: '#company',
  current: '#current',   // current platform
  target: '#target',     // destination platform
  timeline: '#timeline',
  pain: '#pain',
  honeypot: '#website',
};
const FORM = '#intake-form';
const STATUS = '#form-status';

// ---------------------------------------------------------------------------
// Layer 1 — API-level: POST directly with the honeypot filled.
// Fast, no browser involved; isolates routing + function behavior.
// (The JSON keys here are what the function reads — they stay as-is
// regardless of how the DOM identifies its inputs.)
// ---------------------------------------------------------------------------
test('honeypot POST returns fake success without sending email', async ({ request }) => {
  const res = await request.post(`${BASE_URL}/api/inquiry`, {
    data: {
      name: 'CI Honeypot',
      email: 'ci@example.com',
      pain: 'automated honeypot check — no email should be sent',
      website: 'https://spam.example.com', // honeypot: any non-empty value
    },
  });

  // 404 = custom domain not routing to the Pages project.
  // 502 = the function tried to call Resend — honeypot short-circuit broken.
  expect(
    res.status(),
    'expected fake-success 200 (404 = domain routing broken; 502 = honeypot not short-circuiting)',
  ).toBe(200);

  expect(await res.json()).toEqual({ ok: true });
});

// ---------------------------------------------------------------------------
// Layer 2 — Browser-level: real form fill + submit with the honeypot
// populated via script (it's hidden from humans, so fill() won't touch it —
// we set it the way a naive bot would). Verifies the page's own fetch
// wiring and success UI.
// ---------------------------------------------------------------------------
test('form submission with honeypot shows success UI and fires no failure state', async ({ page }) => {
  await page.goto(BASE_URL);

  // Fill every visible field — if any carries a `required` attribute,
  // leaving it empty would block submission before the fetch fires.
  // Selects get selectOption with a fallback to the first real option;
  // adjust if a field is a plain input instead.
  const fillField = async (sel, value) => {
    const el = page.locator(sel);
    if ((await el.count()) === 0) return; // tolerate optional fields
    const tag = await el.evaluate((n) => n.tagName.toLowerCase());
    if (tag === 'select') {
      await el.selectOption({ index: 1 }).catch(() => el.selectOption({ index: 0 }));
    } else {
      await el.fill(value);
    }
  };

  await fillField(FIELD.name, 'CI Honeypot Browser');
  await fillField(FIELD.email, 'ci@example.com');
  await fillField(FIELD.company, 'CI Test Co');
  await fillField(FIELD.current, 'Kareo / Tebra');
  await fillField(FIELD.target, 'AdvancedMD');
  await fillField(FIELD.timeline, 'Exploring');
  await fillField(FIELD.pain, 'automated honeypot check — no email should be sent');

  // Populate the hidden honeypot the way a bot would.
  await page.evaluate((sel) => {
    const trap = document.querySelector(sel);
    if (!trap) throw new Error(`honeypot field ${sel} not found — id drift?`);
    trap.value = 'https://spam.example.com';
  }, FIELD.honeypot);

  // Watch the network request the page itself makes.
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith('/api/inquiry') && r.request().method() === 'POST',
    ),
    page.locator(`${FORM} button[type="submit"]`).click(),
  ]);

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });

  // Success UI in the status element, not the red fallback.
  await expect(page.locator(STATUS)).toContainText('Inquiry sent');
  await expect(page.locator(STATUS)).not.toContainText("didn't send");
});

// ---------------------------------------------------------------------------
// Layer 3 — Contract guard: invalid input must still be rejected.
// Keeps the honeypot short-circuit from swallowing validation.
// ---------------------------------------------------------------------------
test('invalid payload is rejected with 400 (validation not bypassed)', async ({ request }) => {
  const res = await request.post(`${BASE_URL}/api/inquiry`, {
    data: { name: '', email: 'not-an-email', pain: '' },
  });
  expect(res.status()).toBe(400);
});
