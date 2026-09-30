import { describe, expect, it } from 'vitest';

import { CLAIM_SETTLE_MS, INACTIVE_TAB_DEFER_MS, createAlertTabLock, type AlertClaimRecord, type AlertClaimStore } from './alertTabLock';

// Bản ghi dùng chung giữa các "tab" (thay localStorage) và một đồng hồ ảo: mỗi lời
// chờ đăng ký mốc thức dậy, tick() đánh thức theo đúng thứ tự thời gian.
function sharedBrowser() {
    let record: AlertClaimRecord = { claimKey: null, claimTabId: null, lastPlayedAt: null };
    const store: AlertClaimStore = { read: () => record, write: next => (record = next) };

    let clock = 0;
    const sleepers: { wakeAt: number; resolve: () => void }[] = [];
    const wait = (milliseconds: number) =>
        new Promise<void>(resolve => sleepers.push({ wakeAt: clock + milliseconds, resolve }));

    const runAll = async () => {
        for (;;) {
            await Promise.resolve();
            await Promise.resolve();
            if (sleepers.length === 0) return;
            sleepers.sort((a, b) => a.wakeAt - b.wakeAt);
            const next = sleepers.shift()!;
            clock = next.wakeAt;
            next.resolve();
        }
    };

    const tab = (tabId: string) => createAlertTabLock({ store, tabId, wait });

    return { tab, runAll };
}

describe('createAlertTabLock', () => {
    it('một tab mở duy nhất thì luôn được kêu', async () => {
        const browser = sharedBrowser();
        const claim = browser.tab('a').claim('message:1', true);
        await browser.runAll();

        expect(await claim).toBe(true);
    });

    it('nhiều tab cùng nhận một tin: tab đang được mở thắng, tab nền im lặng', async () => {
        const browser = sharedBrowser();
        const background = browser.tab('nen').claim('message:1', false);
        const focused = browser.tab('dang-mo').claim('message:1', true);
        await browser.runAll();

        expect([await focused, await background]).toEqual([true, false]);
    });

    it('không tab nào được mở: đúng một tab nền kêu', async () => {
        const browser = sharedBrowser();
        const claims = ['a', 'b', 'c'].map(tabId => browser.tab(tabId).claim('message:1', false));
        await browser.runAll();

        const results = await Promise.all(claims);
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('tin sau là tin khác nên được xét lại từ đầu', async () => {
        const browser = sharedBrowser();
        const tab = browser.tab('a');
        const first = tab.claim('message:1', true);
        await browser.runAll();
        const second = tab.claim('message:2', true);
        await browser.runAll();

        expect([await first, await second]).toEqual([true, true]);
    });

    it('mốc lần kêu gần nhất dùng chung giữa các tab để giãn cách', () => {
        const browser = sharedBrowser();
        browser.tab('a').markPlayed(5000);

        expect(browser.tab('b').lastPlayedAt()).toBe(5000);
    });

    it('tab nền chờ lâu hơn nhịp chốt của tab đang mở', () => {
        expect(INACTIVE_TAB_DEFER_MS).toBeGreaterThan(CLAIM_SETTLE_MS);
    });
});
