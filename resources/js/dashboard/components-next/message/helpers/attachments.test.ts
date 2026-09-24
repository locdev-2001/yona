import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from 'dashboard/conversation/types';

import {
    BUBBLE_NAMES,
    attachmentExtension,
    attachmentFileName,
    collectMediaAttachments,
    groupAttachmentChips,
    resolveBubbleName,
    resolveGalleryItems,
    singleMediaFrame,
} from './attachments';
import type { MessageAttachment } from './attachments';

const attachment = (overrides: Partial<MessageAttachment> & { id: number; file_type: string }): MessageAttachment => ({
    data_url: `https://cdn.test/${overrides.id}`,
    ...overrides,
});

const message = (overrides: Partial<ConversationMessage> & { id: number }): ConversationMessage => ({
    content: null,
    inbox_id: 1,
    conversation_id: 1,
    message_type: 1,
    content_type: 'text',
    status: 'sent',
    content_attributes: {},
    created_at: 1_756_000_000,
    private: false,
    source_id: null,
    ...overrides,
});

describe('resolveBubbleName', () => {
    it.each([
        ['image', BUBBLE_NAMES.IMAGE],
        ['video', BUBBLE_NAMES.VIDEO],
        ['ig_reel', BUBBLE_NAMES.VIDEO],
        ['audio', BUBBLE_NAMES.AUDIO],
        ['file', BUBBLE_NAMES.FILE],
    ])('đính kèm %s không kèm chữ → bubble %s', (fileType, expected) => {
        expect(resolveBubbleName([attachment({ id: 1, file_type: fileType })], null)).toBe(expected);
    });

    it('fallback luôn lên bubble fallback dù có nội dung chữ', () => {
        expect(resolveBubbleName([attachment({ id: 1, file_type: 'fallback' })], 'xin chào')).toBe(
            BUBBLE_NAMES.FALLBACK,
        );
    });

    it('có nội dung chữ kèm tệp → bubble text (tệp hiện dạng chip)', () => {
        expect(resolveBubbleName([attachment({ id: 1, file_type: 'image' })], 'xin chào')).toBe(BUBBLE_NAMES.TEXT);
    });

    it('nhiều hơn một đính kèm → bubble text', () => {
        const attachments = [
            attachment({ id: 1, file_type: 'image' }),
            attachment({ id: 2, file_type: 'image' }),
        ];
        expect(resolveBubbleName(attachments, null)).toBe(BUBBLE_NAMES.TEXT);
    });

    it('loại chưa có bubble riêng (location) → bubble text', () => {
        expect(resolveBubbleName([attachment({ id: 1, file_type: 'location' })], null)).toBe(BUBBLE_NAMES.TEXT);
    });

    it('không có đính kèm → bubble text', () => {
        expect(resolveBubbleName([], 'xin chào')).toBe(BUBBLE_NAMES.TEXT);
        expect(resolveBubbleName(undefined, null)).toBe(BUBBLE_NAMES.TEXT);
    });
});

describe('groupAttachmentChips', () => {
    it('tách media/ghi âm/tệp và xếp ảnh trước video', () => {
        const groups = groupAttachmentChips([
            attachment({ id: 1, file_type: 'video' }),
            attachment({ id: 2, file_type: 'file' }),
            attachment({ id: 3, file_type: 'image' }),
            attachment({ id: 4, file_type: 'audio' }),
            attachment({ id: 5, file_type: 'location' }),
        ]);

        expect(groups.media.map((item) => item.id)).toEqual([3, 1]);
        expect(groups.recordings.map((item) => item.id)).toEqual([4]);
        expect(groups.files.map((item) => item.id)).toEqual([2]);
    });

    it('danh sách rỗng hoặc thiếu → ba nhóm rỗng', () => {
        expect(groupAttachmentChips(null)).toEqual({ media: [], recordings: [], files: [] });
    });
});

describe('collectMediaAttachments', () => {
    it('chỉ lấy media của tin đã gửi và bù created_at/sender từ tin', () => {
        const sender = { id: 7, name: 'John', type: 'user' as const };
        const collected = collectMediaAttachments([
            message({
                id: 10,
                sender,
                attachments: [
                    attachment({ id: 1, file_type: 'image' }),
                    attachment({ id: 2, file_type: 'file' }),
                ] as unknown as Array<Record<string, unknown>>,
            }),
            message({
                id: 11,
                status: 'progress',
                attachments: [attachment({ id: 3, file_type: 'image' })] as unknown as Array<Record<string, unknown>>,
            }),
            message({ id: 12 }),
        ]);

        expect(collected).toHaveLength(1);
        expect(collected[0]).toMatchObject({ id: 1, message_id: 10, created_at: 1_756_000_000, sender });
    });
});

describe('attachmentFileName / attachmentExtension', () => {
    it('lấy tên gốc khi có, không thì đoạn cuối đường dẫn đã giải mã', () => {
        expect(attachmentFileName(attachment({ id: 1, file_type: 'file', filename: 'Báo giá.pdf' }))).toBe('Báo giá.pdf');
        expect(
            attachmentFileName(attachment({ id: 2, file_type: 'file', data_url: 'https://cdn.test/a/B%C3%A1o%20gi%C3%A1.PDF?x=1' })),
        ).toBe('Báo giá.PDF');
        expect(
            attachmentExtension(attachment({ id: 2, file_type: 'file', data_url: 'https://cdn.test/a/B%C3%A1o%20gi%C3%A1.PDF?x=1' })),
        ).toBe('pdf');
    });

    it('tên không có đuôi thì dùng extension của API', () => {
        expect(attachmentExtension(attachment({ id: 3, file_type: 'file', data_url: 'https://cdn.test/blob', extension: 'XLSX' }))).toBe(
            'xlsx',
        );
    });
});

describe('resolveGalleryItems', () => {
    const conversationMedia = [1, 2, 3, 4].map((id) =>
        attachment({ id, file_type: 'image', created_at: 1_756_000_000 + id, sender: { name: 'Khách' } }),
    );

    it('tin nhiều ảnh: lướt đúng các ảnh của tin, lấy bản có người gửi từ hội thoại', () => {
        const messageMedia = [attachment({ id: 2, file_type: 'image' }), attachment({ id: 3, file_type: 'video' })];
        const items = resolveGalleryItems(messageMedia, conversationMedia, messageMedia[1]);

        expect(items.map((item) => item.id)).toStrictEqual([2, 3]);
        expect(items[0].sender).toStrictEqual({ name: 'Khách' });
    });

    it('tin một ảnh: duyệt cả hội thoại như trước', () => {
        const opened = attachment({ id: 4, file_type: 'image' });

        expect(resolveGalleryItems([opened], conversationMedia, opened)).toBe(conversationMedia);
    });

    it('ảnh chưa gửi xong (không có trong hội thoại) chỉ mở chính nó', () => {
        const pending = attachment({ id: 99, file_type: 'image' });

        expect(resolveGalleryItems([pending], conversationMedia, pending)).toStrictEqual([pending]);
    });
});

describe('singleMediaFrame', () => {
    it('ảnh ngang lớn thu về bề ngang tối đa, giữ tỉ lệ', () => {
        expect(singleMediaFrame(1600, 900)).toStrictEqual({ width: 288, aspectRatio: '288 / 162' });
    });

    it('ảnh dọc bị chặn theo chiều cao tối đa', () => {
        expect(singleMediaFrame(900, 1600)).toStrictEqual({ width: 180, aspectRatio: '180 / 320' });
    });

    it('ảnh rất dọc không hẹp hơn mức tối thiểu, chiều cao vẫn trong khung', () => {
        expect(singleMediaFrame(100, 2000)).toStrictEqual({ width: 128, aspectRatio: '128 / 320' });
    });

    it('ảnh nhỏ giữ đúng kích thước thật', () => {
        expect(singleMediaFrame(200, 150)).toStrictEqual({ width: 200, aspectRatio: '200 / 150' });
    });

    it('chưa biết kích thước thì giữ chỗ 4:3', () => {
        expect(singleMediaFrame(null, null)).toStrictEqual({ width: 240, aspectRatio: '240 / 180' });
    });
});
