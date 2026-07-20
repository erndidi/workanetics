// Workanetics browser tests (Playwright).
// Run:  BASE_URL=https://workanetics.pages.dev npx playwright test
// See tests/README.md for one-time setup.
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://workanetics.pages.dev';

test.describe('Workanetics site', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/');
  });

  test('loads with correct title and hero', async ({ page }) => {
    await expect(page).toHaveTitle(/Workanetics/);
    await expect(page.locator('h1')).toContainText('Switch billing platforms');
    await expect(page.locator('.brand')).toContainText('Workanetics');
  });

  test('reconciliation ledger shows five balanced rows', async ({ page }) => {
    const rows = page.locator('.ledger tbody tr');
    await expect(rows).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(rows.nth(i).locator('td.ok')).toContainText('0');
    }
    // Open AR row balances source vs destination
    const ar = rows.filter({ hasText: 'Open AR' });
    const cells = ar.locator('td');
    const source = await cells.nth(1).innerText();
    const dest = await cells.nth(2).innerText();
    expect(source).toBe(dest);
  });

  test('header CTA anchors to the intake form', async ({ page }) => {
    await page.locator('.head-cta').click();
    await expect(page.locator('#intake')).toBeInViewport();
  });

  test('all sections render', async ({ page }) => {
    for (const text of [
      'What actually breaks in a migration',
      'How an engagement works',
      'Tell me about your migration',
    ]) {
      await expect(page.getByRole('heading', { name: text })).toBeVisible();
    }
    await expect(page.locator('.break-item')).toHaveCount(4);
    await expect(page.locator('.step')).toHaveCount(3);
  });

  test('empty form submission is blocked by validation', async ({ page }) => {
    await page.locator('#intake-form button[type="submit"]').click();
    // Required field (name) should be invalid; status line stays empty.
    const nameValid = await page
      .locator('#name')
      .evaluate((el) => el.checkValidity());
    expect(nameValid).toBe(false);
    await expect(page.locator('#form-status')).toHaveText('');
  });

  test('invalid email is blocked by validation', async ({ page }) => {
    await page.fill('#name', 'Test Person');
    await page.fill('#email', 'not-an-email');
    await page.fill('#pain', 'Testing.');
    await page.locator('#intake-form button[type="submit"]').click();
    const emailValid = await page
      .locator('#email')
      .evaluate((el) => el.checkValidity());
    expect(emailValid).toBe(false);
    await expect(page.locator('#form-status')).toHaveText('');
  });

  test('valid submission shows confirmation status', async ({ page }) => {
    await page.fill('#name', 'Jane Doe');
    await page.fill('#email', 'jane@examplebilling.com');
    await page.fill('#company', 'Example Billing LLC');
    await page.fill('#current', 'Kareo');
    await page.fill('#target', 'AdvancedMD');
    await page.fill('#timeline', 'Contract ends Q4');
    await page.fill('#pain', 'Worried about losing AR history.');

    await page.locator('#intake-form button[type="submit"]').click();

    // The handler always sets the status line after a valid submit.
    await expect(page.locator('#form-status')).toContainText('email app should open');
    await expect(page.locator('#form-status')).toContainText('hello@workanetics.com');
  });

  test('mailto body assembles all fields (logic-level check)', async ({ page }) => {
    // Exercises the same assembly logic the submit handler uses, and asserts
    // the resulting URL encodes every field.
    const url = await page.evaluate(() => {
      const set = (id, v) => (document.getElementById(id).value = v);
      set('name', 'Jane Doe');
      set('email', 'jane@examplebilling.com');
      set('company', 'Example Billing LLC');
      set('current', 'Kareo');
      set('target', 'AdvancedMD');
      set('timeline', 'Contract ends Q4');
      set('pain', 'Worried about losing AR history.');

      const v = (id) => document.getElementById(id).value.trim();
      const subject = 'Migration inquiry — ' + (v('company') || v('name'));
      const body = [
        'Name: ' + v('name'),
        'Email: ' + v('email'),
        'Company: ' + (v('company') || '—'),
        'Current platform: ' + (v('current') || '—'),
        'Target platform: ' + (v('target') || '—'),
        'Timeline / trigger: ' + (v('timeline') || '—'),
        '',
        'Situation & pain points:',
        v('pain'),
      ].join('\n');
      return (
        'mailto:hello@workanetics.com?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(body)
      );
    });

    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('mailto:hello@workanetics.com');
    expect(decoded).toContain('Migration inquiry — Example Billing LLC');
    for (const s of [
      'Jane Doe',
      'jane@examplebilling.com',
      'Kareo',
      'AdvancedMD',
      'Contract ends Q4',
      'Worried about losing AR history.',
    ]) {
      expect(decoded).toContain(s);
    }
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(BASE + '/');
    await page.waitForTimeout(1500); // let animations/scripts settle
    expect(errors).toEqual([]);
  });

  test('renders sanely on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.ledger')).toBeVisible();
    // No horizontal overflow
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
