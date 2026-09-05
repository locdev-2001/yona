import { describe, expect, it } from 'vitest';

import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import {
    fileAttachments,
    fileNameFromUrl,
    hasSharedContent,
    mediaAttachments,
    mediaOverflowCount,
} from './sharedAttachments';

const attachment = (overrides: Partial<MessageAttachment>): MessageAttachment => ({
    id: 1,
    file_type: 'image',
    data_url: 'https://cdn.test/a.png',
    created_at: 1,
    ...overrides,
});

describe('sharedAttachments', () => {
    const image = attachment({ id: 1, file_type: 'image', created_at: 10 });
    const video = attachment({ id: 2, file_type: 'video', created_at: 30 });
    const audio = attachment({ id: 3, file_type: 'audio', created_at: 20 });
    const pdf = attachment({ id: 4, file_type: 'file', extension: 'pdf', created_at: 5 });
    const location = attachment({ id: 5, file_type: 'location', created_at: 40 });
    const withoutUrl = attachment({ id: 6, file_type: 'image', data_url: null, created_at: 50 });
    const all = [image, video, audio, pdf, location, withoutUrl];

    it('gom media theo MEDIA_TYPES và sắp mới nhất trước', () => {
        expect(mediaAttachments(all).map(item => item.id)).toEqual([2, 3, 1]);
    });

    it('gom tệp là phần còn lại, bỏ media và bỏ loại không phải tệp', () => {
        expect(fileAttachments(all).map(item => item.id)).toEqual([4]);
    });

    it('bỏ đính kèm không có data_url ở cả hai nhóm', () => {
        expect(mediaAttachments(all).some(item => item.id === withoutUrl.id)).toBe(false);
        expect(fileAttachments(all).some(item => item.id === withoutUrl.id)).toBe(false);
    });

    it('hasSharedContent bỏ qua location/fallback/contact và đính kèm thiếu url', () => {
        expect(hasSharedContent([location, withoutUrl])).toBe(false);
        expect(hasSharedContent([location, pdf])).toBe(true);
    });

    it('đếm ô "+N" theo đúng công thức của Media.vue', () => {
        expect(mediaOverflowCount(6, 6)).toBe(0);
        expect(mediaOverflowCount(9, 6)).toBe(4);
        expect(mediaOverflowCount(9, 0)).toBe(0);
    });

    it('lấy tên tệp từ url và giải mã ký tự', () => {
        expect(fileNameFromUrl('https://cdn.test/x/b%C3%A1o%20c%C3%A1o.pdf')).toBe('báo cáo.pdf');
        expect(fileNameFromUrl(null)).toBe('');
    });
});
