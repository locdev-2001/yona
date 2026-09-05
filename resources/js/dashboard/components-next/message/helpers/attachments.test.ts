import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from 'dashboard/conversation/types';

import { BUBBLE_NAMES, collectMediaAttachments, groupAttachmentChips, resolveBubbleName } from './attachments';
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
