import { describe, expect, it } from 'vitest';

import { yonaStickerImageUrl, yonaStickerStaticUrl } from './stickerPayload';

const animated = { source: 'yona', image_url: '/s/ab/sticker-128.webp', url: '/s/ab/static-240.png', frames: 24 };

describe('stickerPayload', () => {
    it('sticker kho động: ảnh hiển thị là WebP, ảnh tĩnh là PNG', () => {
        expect(yonaStickerImageUrl(animated)).toBe('/s/ab/sticker-128.webp');
        expect(yonaStickerStaticUrl(animated)).toBe('/s/ab/static-240.png');
    });

    it('sticker một khung, tin cũ chỉ còn ảnh tĩnh, sticker nền tảng: không có ảnh tĩnh riêng', () => {
        expect(yonaStickerStaticUrl({ ...animated, frames: 1 })).toBeNull();
        expect(yonaStickerStaticUrl({ source: 'yona', url: '/s/ab/static.png' })).toBeNull();
        expect(yonaStickerStaticUrl({ id: '98930', url: 'https://cdn.zalo.test/98930.png' })).toBeNull();
    });
});
