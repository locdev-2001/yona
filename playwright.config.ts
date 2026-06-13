import { defineConfig, devices } from '@playwright/test';

// E2E tests live in ./e2e (kept out of tests/ so Pest/PHPUnit ignore them).
// Run: npx playwright install (first time) then `npx playwright test`.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: process.env.APP_URL ?? 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    // Auto-start the app for tests; reuses an already-running server (e.g. `make serve`).
    webServer: {
        command: 'php artisan serve --port=8000',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
