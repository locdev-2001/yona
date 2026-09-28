import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_POLL_ATTEMPTS, POLL_DELAYS_MS, pollDelayFor, useProcessingPoll } from './useProcessingPoll';

afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
});

describe('poll sticker đang xử lý', () => {
    it('lịch 2s, 4s, 8s rồi 15s mãi', () => {
        expect([0, 1, 2, 3, 4, 9].map(pollDelayFor)).toEqual([2000, 4000, 8000, 15000, 15000, 15000]);
    });

    it('lỗi vẫn lên lịch lần sau, đủ số lượt thì dừng và báo hết lượt; Thử lại thì chạy tiếp', async () => {
        vi.useFakeTimers();
        const poll = vi.fn().mockRejectedValue(new Error('mạng'));
        const { result } = renderHook(() => useProcessingPoll({ resetKey: 'a', active: true, poll }));

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) await advance(pollDelayFor(attempt));
        expect(poll).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);
        expect(result.current.exhausted).toBe(true);

        await advance(60_000);
        expect(poll).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS);

        act(() => result.current.retry());
        await advance(POLL_DELAYS_MS[0]);
        expect(poll).toHaveBeenCalledTimes(MAX_POLL_ATTEMPTS + 1);
    });

    it('tab ẩn thì tạm dừng', async () => {
        vi.useFakeTimers();
        const poll = vi.fn().mockResolvedValue(undefined);
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        renderHook(() => useProcessingPoll({ resetKey: 'a', active: true, poll }));
        await advance(10_000);
        expect(poll).not.toHaveBeenCalled();

        hidden.mockReturnValue(false);
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await advance(POLL_DELAYS_MS[0]);
        expect(poll).toHaveBeenCalledTimes(1);
        hidden.mockRestore();
    });
});
