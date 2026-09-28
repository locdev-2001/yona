import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import { describeRejected, prepareUploadQueue } from './prepareUploadQueue';

const RULES = { acceptedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'], maxBytes: 100 };

// GIF hai khung tối giản: đủ để nhận ra là ảnh động.
const twoFrameGif = (padding: number) => {
    const frame = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0, 0];
    return new Uint8Array([...Array.from('GIF89a', c => c.charCodeAt(0)), 1, 0, 1, 0, 0, 0, 0, ...frame, ...frame, 0x3b, ...new Array(padding).fill(0)]);
};

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

describe('prepareUploadQueue', () => {
    it('chỉ giữ ảnh dựng được sticker, giữ thứ tự; tệp bị loại kèm lý do', async () => {
        const good = new File(['a'], 'meo.PNG', { type: 'image/png' });
        const text = new File(['x'], 'not-image.txt', { type: 'text/plain' });
        const fake = new File(['x'], 'fake.png', { type: 'image/png' });
        const heavyGif = new File([twoFrameGif(200)], 'nang.gif', { type: 'image/gif' });
        const second = new File(['b'], 'cho.jpg', { type: 'image/jpeg' });
        const isReadable = vi.fn(async (file: File) => file !== fake);

        const plan = await prepareUploadQueue([good, text, fake, heavyGif, second], RULES, isReadable);

        expect(plan.valid).toEqual([good, second]);
        expect(plan.rejected).toEqual([
            { name: 'not-image.txt', reason: 'type' },
            { name: 'fake.png', reason: 'unreadable' },
            { name: 'nang.gif', reason: 'animated_too_large' },
        ]);
        expect(isReadable.mock.calls.map(([file]) => file.name)).toEqual(['meo.PNG', 'fake.png', 'cho.jpg']);
    });

    it('ảnh tĩnh nặng vẫn nhận (trình duyệt thu nhỏ trước khi gửi)', async () => {
        const heavyStill = new File([new Uint8Array(500)], 'to.png', { type: 'image/png' });

        expect((await prepareUploadQueue([heavyStill], RULES, async () => true)).valid).toEqual([heavyStill]);
    });

    it('mô tả tệp bị loại bằng câu ngắn', () => {
        expect(describeRejected([{ name: 'not-image.txt', reason: 'type' }, { name: 'a.gif', reason: 'animated_too_large' }])).toBe(
            'not-image.txt (không phải ảnh PNG, JPG, WebP, GIF), a.gif (ảnh động quá nặng)',
        );
    });
});
