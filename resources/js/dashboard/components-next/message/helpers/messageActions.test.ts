import { describe, expect, it } from 'vitest';

import { resolveMessageActions } from './messageActions';
import type { MessageActionInput } from './messageActions';

const ALL_HANDLERS = { reply: true, react: true, delete: true, forward: true };

function input(overrides: Partial<MessageActionInput> = {}): MessageActionInput {
    return {
        id: 11,
        messageType: 0,
        status: 'sent',
        isPrivate: false,
        contentAttributes: {},
        inboxCapabilities: ['outbound_reply_to'],
        handlers: ALL_HANDLERS,
        ...overrides,
    };
}

describe('resolveMessageActions — trả lời', () => {
    it('kênh khai outbound_reply_to thì trả lời được cả tin đến lẫn tin đi', () => {
        expect(resolveMessageActions(input({ messageType: 0 })).reply).toBe(true);
        expect(resolveMessageActions(input({ messageType: 1 })).reply).toBe(true);
    });

    it.each([
        ['ghi chú riêng', { isPrivate: true }],
        ['tin đã xoá', { contentAttributes: { deleted: true } }],
        ['tin đang chờ gửi (id âm)', { id: -3 }],
        ['tin gửi lỗi', { status: 'failed' }],
        ['tin đang gửi', { status: 'progress' }],
        ['tin hoạt động', { messageType: 2 }],
        ['tin mẫu', { messageType: 3 }],
        ['kênh không khai năng lực', { inboxCapabilities: [] }],
        ['nơi dựng không truyền handler', { handlers: { ...ALL_HANDLERS, reply: false } }],
    ])('không trả lời được: %s', (_label, overrides) => {
        expect(resolveMessageActions(input(overrides as Partial<MessageActionInput>)).reply).toBe(false);
    });
});

describe('resolveMessageActions — giữ nguyên hành vi cảm xúc và xoá', () => {
    it('cảm xúc cần outbound_reaction, handler và tin chưa xoá', () => {
        expect(resolveMessageActions(input({ inboxCapabilities: ['outbound_reaction'] })).react).toBe(true);
        expect(resolveMessageActions(input({ inboxCapabilities: [] })).react).toBe(false);
        expect(
            resolveMessageActions(input({ inboxCapabilities: ['outbound_reaction'], contentAttributes: { deleted: true } }))
                .react,
        ).toBe(false);
        expect(
            resolveMessageActions(input({ inboxCapabilities: ['outbound_reaction'], handlers: { ...ALL_HANDLERS, react: false } }))
                .react,
        ).toBe(false);
    });

    it('xoá chỉ cho tin đi chưa xoá, không phụ thuộc năng lực', () => {
        expect(resolveMessageActions(input({ messageType: 1, inboxCapabilities: [] })).delete).toBe(true);
        expect(resolveMessageActions(input({ messageType: 0 })).delete).toBe(false);
        expect(resolveMessageActions(input({ messageType: 1, contentAttributes: { deleted: true } })).delete).toBe(false);
        expect(resolveMessageActions(input({ messageType: 1, handlers: { ...ALL_HANDLERS, delete: false } })).delete).toBe(
            false,
        );
    });

    it('recall theo outbound_recall', () => {
        expect(resolveMessageActions(input({ inboxCapabilities: ['outbound_recall'] })).recall).toBe(true);
        expect(resolveMessageActions(input()).recall).toBe(false);
    });
});

describe('resolveMessageActions — chuyển tiếp', () => {
    it('chuyển tiếp được tin đến và tin đi đã gửi, không phụ thuộc năng lực hộp thư nguồn', () => {
        expect(resolveMessageActions(input({ messageType: 0, inboxCapabilities: [] })).forward).toBe(true);
        expect(resolveMessageActions(input({ messageType: 1, status: 'delivered', inboxCapabilities: [] })).forward).toBe(true);
    });

    it.each([
        ['ghi chú riêng', { isPrivate: true }],
        ['tin đã xoá', { contentAttributes: { deleted: true } }],
        ['tin đang chờ gửi (id âm)', { id: -3 }],
        ['tin gửi lỗi', { status: 'failed' }],
        ['tin đang gửi', { status: 'progress' }],
        ['tin hoạt động', { messageType: 2 }],
        ['nơi dựng không truyền handler', { handlers: { ...ALL_HANDLERS, forward: false } }],
    ])('không chuyển tiếp được: %s', (_label, overrides) => {
        expect(resolveMessageActions(input(overrides as Partial<MessageActionInput>)).forward).toBe(false);
    });
});
