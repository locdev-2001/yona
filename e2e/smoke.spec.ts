import { expect, test } from '@playwright/test';

// Smoke test: the Inertia app boots and renders without client-side errors.
// (Would have caught the inertia-laravel v3 / @inertiajs/react page-data mismatch.)
test('welcome page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');

    // Inertia mounted the React app into #app.
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('login page is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
});
