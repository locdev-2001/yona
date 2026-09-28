import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal, StickerButton } from './stickerLibraryUi';

function Harness({ onRequestClose }: { onRequestClose: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <div data-testid="page">
            <StickerButton onClick={() => setOpen(true)}>Mở</StickerButton>
            <Modal
                open={open}
                title="Hộp thử"
                onRequestClose={reason => {
                    onRequestClose();
                    if (reason === 'escape') setOpen(false);
                }}
            >
                <StickerButton>Một</StickerButton>
                <StickerButton>Hai</StickerButton>
            </Modal>
        </div>
    );
}

describe('Modal của kho sticker', () => {
    it('portal ra body, nền inert, bẫy Tab, Esc qua onRequestClose rồi trả focus', () => {
        const onRequestClose = vi.fn();
        const { container } = render(<Harness onRequestClose={onRequestClose} />);
        const opener = screen.getByRole('button', { name: 'Mở' });
        opener.focus();
        fireEvent.click(opener);

        const dialog = screen.getByRole('dialog', { name: 'Hộp thử' });
        expect(container.contains(dialog)).toBe(false);
        expect(container).toHaveAttribute('inert');
        expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus();

        screen.getByRole('button', { name: 'Hai' }).focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(screen.getByRole('button', { name: 'Một' })).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(screen.getByRole('button', { name: 'Hai' })).toHaveFocus();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onRequestClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(container).not.toHaveAttribute('inert');
        expect(opener).toHaveFocus();
    });

    it('mọi nút mang reset-base để CSS console quản trị không tô đè', () => {
        render(<StickerButton tone="danger">Xoá</StickerButton>);
        expect(screen.getByRole('button', { name: 'Xoá' })).toHaveClass('reset-base');
    });
});
