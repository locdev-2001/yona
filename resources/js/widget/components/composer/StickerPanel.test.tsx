import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_STICKER_DISPLAY_SIZE } from 'shared/sticker/stickerDisplaySize';
import StickerPanel from './StickerPanel';

beforeEach(() => window.localStorage.clear());

describe('StickerPanel', () => {
    it('ẩn tab Sticker khi danh mục rỗng, mở sẵn tab Emoji', () => {
        render(<StickerPanel stickers={[]} onSelectEmoji={vi.fn()} onSelectSticker={vi.fn()} />);

        expect(screen.queryByRole('tab', { name: 'Stickers' })).not.toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Emoji' })).toHaveAttribute('aria-selected', 'true');
    });

    it('danh mục có sticker kho Yona thì mở sẵn tab Sticker, lưới hiện ảnh WebP ở cạnh hiển thị', () => {
        const sticker = { id: 'yona:12', image_url: '/storage/stickers/ab/sticker.webp', pack_id: 'yona:3', label: 'Mèo vẫy' };
        render(<StickerPanel stickers={[sticker]} onSelectEmoji={vi.fn()} onSelectSticker={vi.fn()} />);

        expect(screen.getByRole('tab', { name: 'Stickers' })).toHaveAttribute('aria-selected', 'true');
        const image = screen.getByRole('button', { name: 'Mèo vẫy' }).querySelector('img');
        expect(image).toHaveAttribute('src', '/storage/stickers/ab/sticker.webp');
        expect(image?.style.width).toBe(`${DEFAULT_STICKER_DISPLAY_SIZE}px`);
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
