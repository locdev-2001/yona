import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StickerBubble from './StickerBubble';
import type { WidgetMessage } from '../../types';

vi.mock('shared/sticker/thorvgLoader', () => ({ createLottiePlayer: vi.fn() }));

const stickerMessage = (sticker: NonNullable<WidgetMessage['content_attributes']>['sticker']): WidgetMessage => ({
    id: 1,
    content: null,
    content_type: 'sticker',
    message_type: 1,
    created_at: 1758000000,
    content_attributes: { sticker },
});

describe('StickerBubble của widget', () => {
    it('sticker kênh ngoài (không có source) giữ nguyên ảnh 100×100 từ url', () => {
        const { container } = render(
            <StickerBubble message={stickerMessage({ id: '98930', url: 'https://cdn.zalo.test/98930.webp' })} />,
        );

        const image = container.querySelector('img.yona-sticker');
        expect(image?.getAttribute('src')).toBe('https://cdn.zalo.test/98930.webp');
        expect(image?.className).toContain('h-[100px] w-[100px]');
        expect(container.querySelector('[data-sticker-player]')).toBeNull();
    });

    it('sticker kênh ngoài chỉ có thumbnail vẫn hiện ảnh', () => {
        const { container } = render(
            <StickerBubble message={stickerMessage({ id: '1', thumbnail: 'https://cdn.zalo.test/1-thumb.webp' })} />,
        );

        expect(container.querySelector('img.yona-sticker')?.getAttribute('src')).toBe('https://cdn.zalo.test/1-thumb.webp');
    });

    it('sticker kho Yona đi qua trình phát, poster hiện ngay trong khung 100×100', async () => {
        const { container } = render(
            <StickerBubble
                message={stickerMessage({
                    source: 'yona',
                    id: 12,
                    url: 'https://yona.test/storage/stickers/ab/static.png',
                    poster_url: 'https://yona.test/storage/stickers/ab/poster.webp',
                    animation_url: 'https://yona.test/storage/stickers/ab/anim.json',
                })}
            />,
        );

        expect(container.querySelector('img.yona-sticker')?.getAttribute('src')).toBe(
            'https://yona.test/storage/stickers/ab/poster.webp',
        );

        const player = await waitFor(() => {
            const found = container.querySelector('[data-sticker-player]');
            expect(found).not.toBeNull();
            return found;
        });
        expect(player?.className).toContain('yona-sticker h-[100px] w-[100px]');
        expect(player?.querySelector('img')?.getAttribute('src')).toBe(
            'https://yona.test/storage/stickers/ab/poster.webp',
        );
    });
});
