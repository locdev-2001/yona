import { expect, test } from '@playwright/test';

// Capstone flow (brief): sign in as a workspace admin, create a team, then
// invite a member and assign a role — exercising the platform-foundation UI
// end to end. Runs against the dev server seeded by FoundationSeeder
// (test@example.com is an admin of "Yona"). Vietnamese is the default UI
// locale. Unique suffixes keep re-runs idempotent.

const ADMIN_EMAIL = 'test@example.com';
const ADMIN_PASSWORD = 'password';

async function login(page) {
    await page.goto('/login');
    await page.locator('input[type=email]').fill(ADMIN_EMAIL);
    await page.locator('input[type=password]').fill(ADMIN_PASSWORD);
    await page.locator('button[type=submit]').click();
    await page.waitForURL(/dashboard/);
}

test('admin creates a team', async ({ page }) => {
    const teamName = `QA Team ${Date.now()}`;

    await login(page);
    await page.goto('/settings/teams');

    await page.getByRole('button', { name: 'Thêm nhóm' }).click();
    await page.locator('#team-name').fill(teamName);
    await page.getByRole('button', { name: 'Lưu' }).click();

    await expect(page.getByText(teamName)).toBeVisible();
});

test('admin invites a member and assigns a role', async ({ page }) => {
    const email = `qa+${Date.now()}@example.com`;

    await login(page);
    await page.goto('/settings/members');

    await page.getByRole('button', { name: 'Mời thành viên' }).click();
    await page.locator('#invite-email').fill(email);

    // Role select (shadcn): open the first combobox in the dialog, pick Sales Rep.
    await page.getByRole('dialog').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Nhân viên kinh doanh' }).click();

    await page.getByRole('button', { name: 'Mời', exact: true }).click();

    await expect(page.getByText(email)).toBeVisible();
});
