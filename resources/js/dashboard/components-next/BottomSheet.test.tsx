import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BottomSheet from './BottomSheet';

describe('bottom sheet dùng chung', () => {
    it('đóng thì không dựng gì, mở thì có hộp thoại mang tên tiêu đề', () => {
        const { rerender } = render(
            <BottomSheet isOpen={false} title="Trạng thái hội thoại" onClose={() => undefined}>
                <button type="button">Giải quyết</button>
            </BottomSheet>,
        );
        expect(screen.queryByRole('dialog')).toBeNull();

        rerender(
            <BottomSheet isOpen title="Trạng thái hội thoại" onClose={() => undefined}>
                <button type="button">Giải quyết</button>
            </BottomSheet>,
        );
        expect(screen.getByRole('dialog', { name: 'Trạng thái hội thoại' })).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Giải quyết' })).not.toBeNull();
    });

    it('Esc gọi onClose', async () => {
        const onClose = vi.fn();
        render(
            <BottomSheet isOpen title="Lọc" onClose={onClose}>
                <button type="button">Chip</button>
            </BottomSheet>,
        );

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('chạm nền mờ gọi onClose', async () => {
        const onClose = vi.fn();
        render(
            <BottomSheet isOpen title="Lọc" onClose={onClose}>
                <button type="button">Chip</button>
            </BottomSheet>,
        );

        const backdrop = document.querySelector('[data-bottom-sheet-backdrop]') as HTMLElement;
        fireEvent.pointerDown(backdrop);
        fireEvent.mouseDown(backdrop);
        fireEvent.click(backdrop);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
