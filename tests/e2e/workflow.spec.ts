import { test, expect } from '@playwright/test';

test.describe('TraceGuard SOC Dashboard - End-to-End Suite', () => {

  test('1. Authentication: Login & Logout Lifecycle', async ({ page }) => {
    // Navigate to Login
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('h1')).toContainText('TraceGuard');

    // Authenticate as Admin
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'AdminPassword2026!');
    await page.click('button[type="submit"]');

    // Verify successful login to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h2')).toContainText('SOC Overview');

    // Navigate to settings and log out
    await page.click('a:has-text("Settings")');
    await page.waitForURL('**/dashboard/settings');
    await page.click('button:has-text("Log Out")');

    // Verify redirected back to login
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('TraceGuard');
  });

  test('2. Security: Unauthorized Route Access Redirection', async ({ page }) => {
    // Attempt direct navigation to protected dashboard without session
    await page.goto('http://localhost:3000/dashboard/incidents');
    // Verify middleware redirects to login page
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('TraceGuard');
  });

  test('3. RBAC: Admin vs Analyst Permissions Verification', async ({ page }) => {
    // A. Verify Analyst Role Restrictions
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'analyst');
    await page.fill('input[id="password"]', 'AnalystPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Analyst on Rules page: "Create New Rule" button must NOT exist
    await page.click('a:has-text("Detection Rules")');
    await page.waitForURL('**/dashboard/rules');
    await expect(page.locator('button:has-text("Create New Rule")')).not.toBeVisible();

    // Analyst on Assets page: "Register Asset" button must NOT exist
    await page.click('a:has-text("Asset Inventory")');
    await page.waitForURL('**/dashboard/assets');
    await expect(page.locator('button:has-text("Register Asset")')).not.toBeVisible();

    // Log out analyst
    await page.click('a:has-text("Settings")');
    await page.click('button:has-text("Log Out")');

    // B. Verify Admin Role Privileges
    await page.waitForURL('**/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'AdminPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Admin on Rules page: "Create New Rule" button MUST be visible
    await page.click('a:has-text("Detection Rules")');
    await page.waitForURL('**/dashboard/rules');
    await expect(page.locator('button:has-text("Create New Rule")')).toBeVisible();

    // Admin on Assets page: "Register Asset" button MUST be visible
    await page.click('a:has-text("Asset Inventory")');
    await page.waitForURL('**/dashboard/assets');
    await expect(page.locator('button:has-text("Register Asset")')).toBeVisible();
  });

  test('4. Incident Queue: Filtering and Search Triage', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'AdminPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('a:has-text("Incident Queue")');
    await page.waitForURL('**/dashboard/incidents');

    // Filter by Severity: HIGH
    const severitySelect = page.locator('select').first();
    await severitySelect.selectOption('HIGH');
    await page.waitForTimeout(300);

    // Search by keyword
    const searchInput = page.locator('input[placeholder*="Search by title"]');
    await searchInput.fill('Beaconing');
    await page.waitForTimeout(300);

    // Verify matching row is displayed in table
    await expect(page.locator('table')).toContainText('Beaconing');
  });

  test('5. Incident Investigation: Note Logging and Status Change', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'analyst');
    await page.fill('input[id="password"]', 'AnalystPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('a:has-text("Incident Queue")');
    await page.waitForURL('**/dashboard/incidents');

    // Open first incident
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForURL('**/dashboard/incidents/**');

    // Verify incident details loaded
    await expect(page.locator('h1')).toBeVisible();

    // Update Status to CONTAINED
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('CONTAINED');
    await page.waitForTimeout(500);

    // Post an Analyst Investigation Note
    const noteInput = page.locator('textarea[placeholder*="Write forensic findings"]');
    await noteInput.fill('Quarantined network segment and blocked C2 destination.');
    await page.click('button:has-text("Post Note")');
    await page.waitForTimeout(500);

    // Verify note is appended to the notes list
    await expect(page.locator('body')).toContainText('Quarantined network segment');
  });

  test('6. Alert Ingestion: Validation and Preview Pipeline', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'AdminPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('a:has-text("Alert Import")');
    await page.waitForURL('**/dashboard/import');

    // Paste sample JSON alerts
    const sampleAlerts = JSON.stringify([
      {
        timestamp: new Date().toISOString(),
        ruleName: 'Egress Ransomware Beaconing',
        category: 'Command and Control',
        severity: 'CRITICAL',
        sourceIp: '10.0.5.22',
        destIp: '185.220.101.42',
        targetHost: 'finance-srv-02',
        details: 'High volume encrypted outbound beacons observed on port 443.',
        mitreAttack: 'T1071.001'
      }
    ], null, 2);

    const textarea = page.locator('textarea[placeholder*="Paste raw alert log records"]');
    await textarea.fill(sampleAlerts);

    // Click Preview
    await page.click('button:has-text("Preview Ingestion")');
    await page.waitForTimeout(500);

    // Verify preview summary and row displayed
    await expect(page.locator('body')).toContainText('Validation Summary');
    await expect(page.locator('body')).toContainText('Egress Ransomware Beaconing');
  });

  test('7. Reporting: Incident Investigation Report Generation', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[id="username"]', 'analyst');
    await page.fill('input[id="password"]', 'AnalystPassword2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.click('a:has-text("Incident Queue")');
    await page.waitForURL('**/dashboard/incidents');

    // Open first incident
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForURL('**/dashboard/incidents/**');

    // Click Printable Report button
    const reportBtn = page.locator('button:has-text("Printable Report"), a:has-text("Printable Report")').first();
    await expect(reportBtn).toBeVisible();
  });

});
