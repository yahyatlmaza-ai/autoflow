import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://autoflow-h4r8.onrender.com';

test.describe('Authentication', () => {
  test('Login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout:15000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Demo login works and redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'demo@autoflow.dz');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForURL(/dashboard/, { timeout:15000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Invalid credentials show error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    const error = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
    await expect(error).toBeVisible({ timeout:8000 });
  });
});

test.describe('Dashboard (Demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'demo@autoflow.dz');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForURL(/dashboard/, { timeout:15000 });
  });

  test('Dashboard shows key stats', async ({ page }) => {
    await expect(page.locator('text=/orders|Orders/i').first()).toBeVisible({ timeout:10000 });
  });

  test('Navigation sidebar works', async ({ page }) => {
    const nav = page.locator('nav, [class*="sidebar"], [class*="Sidebar"]').first();
    await expect(nav).toBeVisible({ timeout:8000 });
  });

  test('Orders list loads', async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), button:has-text("Orders")').first();
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await page.waitForTimeout(1500);
    }
    await expect(page.locator('table, [class*="table"], [class*="list"]').first()).toBeVisible({ timeout:10000 });
  });
});

test.describe('Security', () => {
  test('Admin route is protected from unauthenticated access', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/admin');
  });

  test('API endpoints require authentication', async ({ page }) => {
    const r = await page.request.get(`${BASE_URL}/api/orders`);
    expect([401, 403]).toContain(r.status());
  });

  test('Health endpoint returns ok', async ({ page }) => {
    const r = await page.request.get(`${BASE_URL}/health`);
    expect(r.status()).toBe(200);
    const json = await r.json();
    expect(json.status).toBe('ok');
  });
});

test.describe('Performance', () => {
  test('Homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
