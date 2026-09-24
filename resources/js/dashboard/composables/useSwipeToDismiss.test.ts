import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SWIPE_DISMISS_DISTANCE_PX, useSwipeToDismiss } from './useSwipeToDismiss';

const touchAt = (points: Array<[number, number]>) =>
    ({ touches: points.map(([clientX, clientY]) => ({ clientX, clientY })) }) as unknown as TouchEvent;

function swipe(onDismiss: () => void, from: [number, number], to: [number, number]) {
    const { result } = renderHook(() => useSwipeToDismiss(onDismiss));
    act(() => result.current.handlers.onTouchStart(touchAt([from])));
    act(() => result.current.handlers.onTouchMove(touchAt([to])));

    return result;
}

describe('vuốt xuống để đóng', () => {
    it('vuốt xuống quá ngưỡng thì đóng và trả lớp nội dung về chỗ cũ', () => {
        const onDismiss = vi.fn();
        const result = swipe(onDismiss, [100, 100], [110, 100 + SWIPE_DISMISS_DISTANCE_PX + 20]);

        expect(result.current.style?.transform).toBe(`translateY(${SWIPE_DISMISS_DISTANCE_PX + 20}px)`);

        act(() => result.current.handlers.onTouchEnd());

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(result.current.style).toBeUndefined();
    });

    it('vuốt xuống ngắn thì nảy về, không đóng', () => {
        const onDismiss = vi.fn();
        const result = swipe(onDismiss, [100, 100], [100, 100 + SWIPE_DISMISS_DISTANCE_PX - 30]);

        act(() => result.current.handlers.onTouchEnd());

        expect(onDismiss).not.toHaveBeenCalled();
        expect(result.current.style).toBeUndefined();
    });

    it('vuốt ngang hay vuốt lên không tính là đóng', () => {
        const onDismiss = vi.fn();
        const sideways = swipe(onDismiss, [100, 100], [300, 190]);
        act(() => sideways.current.handlers.onTouchEnd());
        const upward = swipe(onDismiss, [100, 300], [100, 100]);
        act(() => upward.current.handlers.onTouchEnd());

        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('chạm hai ngón (phóng to) thì bỏ qua cú vuốt', () => {
        const onDismiss = vi.fn();
        const { result } = renderHook(() => useSwipeToDismiss(onDismiss));

        act(() => result.current.handlers.onTouchStart(touchAt([[100, 100]])));
        act(() => result.current.handlers.onTouchMove(touchAt([[100, 300], [150, 320]])));
        act(() => result.current.handlers.onTouchEnd());

        expect(onDismiss).not.toHaveBeenCalled();
    });
});
