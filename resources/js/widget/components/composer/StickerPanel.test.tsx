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

    it('danh mục có sticker kho Yona thì mở sẵn tab Sticker, lưới chỉ là ảnh poster tĩnh', () => {
        const sticker = { id: 'yona:12', image_url: '/storage/stickers/ab/poster.webp', pack_id: 'yona:3', label: 'Mèo vẫy' };
        const { container } = render(
            <StickerPanel stickers={[sticker]} onSelectEmoji={vi.fn()} onSelectSticker={vi.fn()} />,
        );

        expect(screen.getByRole('tab', { name: 'Stickers' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: 'Mèo vẫy' }).querySelector('img')).toHaveAttribute(
            'src',
            '/storage/stickers/ab/poster.webp',
        );
        expect(container.querySelector('[data-sticker-player], lottie-player')).toBeNull();
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
