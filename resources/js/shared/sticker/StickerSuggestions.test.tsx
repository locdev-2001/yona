import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StickerSuggestions, { useDismissibleQuery } from './StickerSuggestions';

const STICKERS = [
    { id: 'a', image_url: '/a.webp', label: 'Haha' },
    { id: 'b', image_url: '/b.webp', label: null },
    { id: 'c', image_url: '/c.webp', label: 'Hihi' },
];
const LABELS = { list: 'Sticker gợi ý', dismiss: 'Ẩn gợi ý', stickerFallback: 'Sticker' };

function renderRow(overrides: Partial<Parameters<typeof StickerSuggestions>[0]> = {}) {
    const handlers = { onPick: vi.fn(), onDismiss: vi.fn() };
    render(<StickerSuggestions stickers={STICKERS} labels={LABELS} dismissIcon="×" {...handlers} {...overrides} />);
    return handlers;
}

describe('StickerSuggestions', () => {
    it('không có sticker thì không vẽ gì', () => {
        renderRow({ stickers: [] });

        expect(screen.queryByRole('toolbar')).toBeNull();
    });

    it('mỗi sticker là một nút ảnh, không nhãn thì dùng tên chung', () => {
        renderRow();

        expect(screen.getByRole('toolbar', { name: 'Sticker gợi ý' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Haha' }).querySelector('img')).toHaveAttribute('src', '/a.webp');
        expect(screen.getByRole('button', { name: 'Sticker' })).toBeInTheDocument();
    });

    it('bấm là chọn đúng sticker', () => {
        const { onPick } = renderRow();
        fireEvent.click(screen.getByRole('button', { name: 'Hihi' }));

        expect(onPick).toHaveBeenCalledWith(STICKERS[2]);
    });

    it('một điểm dừng Tab; mũi tên đi vòng, Home/End về hai đầu, Enter và Space chọn', () => {
        const { onPick } = renderRow();
        const [first, second, third] = [
            screen.getByRole('button', { name: 'Haha' }),
            screen.getByRole('button', { name: 'Sticker' }),
            screen.getByRole('button', { name: 'Hihi' }),
        ];
        expect([first, second, third].map(button => button.tabIndex)).toEqual([0, -1, -1]);

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowLeft' });
        expect(third).toHaveFocus();
        fireEvent.keyDown(third, { key: 'ArrowRight' });
        expect(first).toHaveFocus();
        fireEvent.keyDown(first, { key: 'End' });
        expect(third).toHaveFocus();
        expect(third.tabIndex).toBe(0);
        fireEvent.keyDown(third, { key: 'Home' });
        fireEvent.keyDown(first, { key: 'ArrowDown' });
        expect(second).toHaveFocus();

        fireEvent.keyDown(second, { key: 'Enter' });
        fireEvent.keyDown(second, { key: ' ' });
        expect(onPick).toHaveBeenCalledTimes(2);
        expect(onPick).toHaveBeenLastCalledWith(STICKERS[1]);
    });

    it('Esc trong hàng thì đóng và không để phím lan ra ngoài (không đóng cả khung chat)', () => {
        const outerKeyDown = vi.fn();
        const onDismiss = vi.fn();
        render(
            <div onKeyDown={outerKeyDown}>
                <StickerSuggestions stickers={STICKERS} labels={LABELS} dismissIcon="×" onPick={vi.fn()} onDismiss={onDismiss} />
            </div>,
        );

        fireEvent.keyDown(screen.getByRole('button', { name: 'Haha' }), { key: 'Escape' });

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(outerKeyDown).not.toHaveBeenCalled();
    });

    it('nút đóng gọi onDismiss', () => {
        const { onDismiss, onPick } = renderRow();
        fireEvent.click(screen.getByRole('button', { name: 'Ẩn gợi ý' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onPick).not.toHaveBeenCalled();
    });
});

describe('useDismissibleQuery', () => {
    it('đóng chỉ áp cho đúng cụm đang gõ; đổi cụm là hiện lại, quay về cụm cũ cũng hiện lại', () => {
        const { result, rerender } = renderHook(({ query }) => useDismissibleQuery(query), {
            initialProps: { query: 'haha' as string | null },
        });
        expect(result.current.isDismissed).toBe(false);

        act(() => result.current.dismiss());
        rerender({ query: 'haha' });
        expect(result.current.isDismissed).toBe(true);

        rerender({ query: 'hahaa' });
        expect(result.current.isDismissed).toBe(false);
        rerender({ query: 'haha' });
        expect(result.current.isDismissed).toBe(false);
    });
});
