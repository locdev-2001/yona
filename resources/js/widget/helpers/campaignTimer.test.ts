import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignTimer } from './campaignTimer';

// Port từ hành vi campaignTimer.js — bộ đếm nhả đúng sau `time_on_page` giây,
// và hẹn lại thì bộ cũ phải bị huỷ (đổi trang không được nhả campaign của trang cũ).

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    campaignTimer.clearTimers();
    vi.useRealTimers();
});

describe('campaignTimer', () => {
    it('fires a campaign after its time on page', () => {
        const onTimeout = vi.fn();
        campaignTimer.initTimers(
            [{ id: 7, timeOnPage: 5, triggerOnlyDuringBusinessHours: false, url: 'https://a.test/pricing' }],
            onTimeout,
        );

        vi.advanceTimersByTime(4999);
        expect(onTimeout).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onTimeout).toHaveBeenCalledWith(7);
    });

    it('cancels the previous timers when re-armed', () => {
        const onTimeout = vi.fn();
        campaignTimer.initTimers(
            [{ id: 1, timeOnPage: 5, triggerOnlyDuringBusinessHours: false, url: 'https://a.test/pricing' }],
            onTimeout,
        );
        campaignTimer.initTimers(
            [{ id: 2, timeOnPage: 5, triggerOnlyDuringBusinessHours: false, url: 'https://a.test/about' }],
            onTimeout,
        );

        vi.advanceTimersByTime(5000);

        expect(onTimeout).toHaveBeenCalledTimes(1);
        expect(onTimeout).toHaveBeenCalledWith(2);
    });

    it('stops every timer on clear', () => {
        const onTimeout = vi.fn();
        campaignTimer.initTimers(
            [{ id: 1, timeOnPage: 1, triggerOnlyDuringBusinessHours: false, url: 'https://a.test/' }],
            onTimeout,
        );

        campaignTimer.clearTimers();
        vi.advanceTimersByTime(5000);

        expect(onTimeout).not.toHaveBeenCalled();
    });
});
