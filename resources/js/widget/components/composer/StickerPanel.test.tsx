import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StickerPanel from './StickerPanel';

beforeEach(() => window.localStorage.clear());

describe('StickerPanel', () => {
    it('ẩn tab Sticker khi danh mục rỗng, mở sẵn tab Emoji', () => {
        render(<StickerPanel stickers={[]} onSelectEmoji={vi.fn()} onSelectSticker={vi.fn()} />);

        expect(screen.queryByRole('tab', { name: 'Stickers' })).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Emoji' })).toHaveAttribute('aria-selected', 'true');
    });

    it('sticker vừa gửi hiện trong tab Gần đây', () => {
        const sticker = { id: 'hi', image_url: '/s/hi.png', pack_id: null, label: 'Chào' };
        const onSelectSticker = vi.fn();
        render(<StickerPanel stickers={[sticker]} onSelectEmoji={vi.fn()} onSelectSticker={onSelectSticker} />);

        fireEvent.click(screen.getByRole('button', { name: 'Chào' }));
        fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));
        fireEvent.click(screen.getByRole('button', { name: 'Chào' }));

        expect(onSelectSticker).toHaveBeenCalledTimes(2);
    });
});
