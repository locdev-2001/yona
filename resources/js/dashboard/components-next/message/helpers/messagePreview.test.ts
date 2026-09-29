import { describe, expect, it } from 'vitest';
import { t } from '../../../../i18n';
import { messagePreviewBody } from './messagePreview';

describe('messagePreviewBody', () => {
    it('sticker Yona mang ảnh PNG đính kèm vẫn là sticker, không phải ảnh', () => {
        expect(messagePreviewBody({ content_type: 'sticker', content: null, attachments: [{ file_type: 'image' }] })).toEqual({ kind: 'sticker' });
    });

    it('sticker Zalo kèm chữ và dòng máy chủ gửi sẵn vẫn là sticker', () => {
        expect(
            messagePreviewBody({ content_type: 'sticker', content: 'haha', preview_text: 'Sticker', attachments: [{ file_type: 'image' }] }),
        ).toEqual({ kind: 'sticker' });
    });

    it('tin đã thu hồi đứng trước mọi loại tin', () => {
        expect(messagePreviewBody({ content_type: 'sticker', content_attributes: { deleted: true } })).toEqual({
            kind: 'text',
            text: t('CONVERSATION.MESSAGE_DELETED'),
        });
    });

    it('ảnh không chữ là tệp đính kèm theo loại tệp', () => {
        expect(messagePreviewBody({ content_type: 'text', content: null, attachments: [{ file_type: 'image' }] })).toEqual({
            kind: 'attachment',
            fileType: 'image',
        });
    });

    it('dòng máy chủ gửi sẵn thắng content rỗng của tin có cấu trúc', () => {
        expect(messagePreviewBody({ content_type: 'cards', content: null, preview_text: 'Áo thun' })).toEqual({ kind: 'text', text: 'Áo thun' });
    });

    it('không chữ không tệp là rỗng', () => {
        expect(messagePreviewBody({ content_type: 'text', content: '' })).toEqual({ kind: 'empty' });
    });
});
