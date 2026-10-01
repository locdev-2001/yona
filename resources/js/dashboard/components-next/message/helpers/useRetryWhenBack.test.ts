import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRetryWhenBack } from './useRetryWhenBack';

function setVisibility(state: DocumentVisibilityState) {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => setVisibility('visible'));

describe('useRetryWhenBack', () => {
    it('thử lại khi có mạng lại và khi tab hiện lại', () => {
        const retry = vi.fn();
        renderHook(() => useRetryWhenBack(true, retry));

        window.dispatchEvent(new Event('online'));
        setVisibility('hidden');
        setVisibility('visible');

        expect(retry).toHaveBeenCalledTimes(2);
    });

    it('không làm gì khi ảnh không lỗi', () => {
        const retry = vi.fn();
        renderHook(() => useRetryWhenBack(false, retry));

        window.dispatchEvent(new Event('online'));
        setVisibility('visible');

        expect(retry).not.toHaveBeenCalled();
    });

    it('gỡ lắng nghe khi ảnh đã tải được', () => {
        const retry = vi.fn();
        const { rerender } = renderHook(({ active }) => useRetryWhenBack(active, retry), {
            initialProps: { active: true },
        });

        rerender({ active: false });
        window.dispatchEvent(new Event('online'));

        expect(retry).not.toHaveBeenCalled();
    });
});
