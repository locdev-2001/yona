import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StickerDisplaySizeProvider } from 'shared/sticker/stickerDisplaySize';
import StickerBubble from './StickerBubble';
import type { WidgetMessage } from '../../types';

const stickerMessage = (sticker: NonNullable<WidgetMessage['content_attributes']>['sticker']): WidgetMessage => ({
    id: 1,
    content: null,
    content_type: 'sticker',
    message_type: 1,
    created_at: 1758000000,
    content_attributes: { sticker },
});

const stickerImage = (container: HTMLElement) => container.querySelector<HTMLImageElement>('img.yona-sticker');

describe('StickerBubble của widget', () => {
    it('sticker kênh ngoài (không có source) hiện ảnh từ url ở cạnh hiển thị mặc định 64', () => {
        const { container } = render(
            <StickerBubble message={stickerMessage({ id: '98930', url: 'https://cdn.zalo.test/98930.webp' })} />,
        );

        const image = stickerImage(container);
        expect(image?.getAttribute('src')).toBe('https://cdn.zalo.test/98930.webp');
        expect(image?.style.width).toBe('64px');
    });

    it('sticker kênh ngoài chỉ có thumbnail vẫn hiện ảnh', () => {
        const { container } = render(
            <StickerBubble message={stickerMessage({ id: '1', thumbnail: 'https://cdn.zalo.test/1-thumb.webp' })} />,
        );

        expect(stickerImage(container)?.getAttribute('src')).toBe('https://cdn.zalo.test/1-thumb.webp');
    });

    it('sticker kho Yona hiện image_url (WebP) ở cạnh hiển thị máy chủ cấu hình', () => {
        const { container } = render(
            <StickerDisplaySizeProvider size={96}>
                <StickerBubble
                    message={stickerMessage({
                        source: 'yona',
                        id: 12,
                        image_url: 'https://yona.test/storage/stickers/ab/sticker.webp',
                        url: 'https://yona.test/storage/stickers/ab/static.png',
                    })}
                />
            </StickerDisplaySizeProvider>,
        );

        const image = stickerImage(container);
        expect(image?.getAttribute('src')).toBe('https://yona.test/storage/stickers/ab/sticker.webp');
        expect(image?.style.width).toBe('96px');
    });

    it('tin sticker kho Yona cũ chỉ còn url tĩnh vẫn hiện ảnh', () => {
        const { container } = render(
            <StickerBubble
                message={stickerMessage({ source: 'yona', id: 7, url: 'https://yona.test/storage/stickers/cd/static.png' })}
            />,
        );

        expect(stickerImage(container)?.getAttribute('src')).toBe('https://yona.test/storage/stickers/cd/static.png');
    });

    it('cạnh hiển thị máy chủ gửi sai thì về mặc định 64', () => {
        const { container } = render(
            <StickerDisplaySizeProvider size="lớn">
                <StickerBubble message={stickerMessage({ id: '1', url: 'https://cdn.zalo.test/1.webp' })} />
            </StickerDisplaySizeProvider>,
        );

        expect(stickerImage(container)?.style.width).toBe('64px');
    });
});
