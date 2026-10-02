import { describe, expect, it } from 'vitest';

import { groupMessageActions, hasAnyMessageAction, messagePermalink, resolveMessageActions } from './messageActions';
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

describe('resolveMessageActions — thao tác trên nội dung', () => {
    const withText = (overrides: Partial<MessageActionInput> = {}) =>
        input({
            content: 'Số tài khoản 0123',
            handlers: { ...ALL_HANDLERS, createCannedResponse: true, translate: true },
            ...overrides,
        });

    it('tin có chữ thì sao chép, sao chép liên kết, tạo câu trả lời mẫu và dịch được', () => {
        const flags = resolveMessageActions(withText());

        expect([flags.copy, flags.copyLink, flags.createCannedResponse, flags.translate]).toEqual([true, true, true, true]);
    });

    it('tin không có chữ vẫn sao chép liên kết được, còn lại ẩn', () => {
        const flags = resolveMessageActions(withText({ content: '   ' }));

        expect([flags.copy, flags.copyLink, flags.createCannedResponse, flags.translate]).toEqual([false, true, false, false]);
    });

    it('Dịch và Tạo câu trả lời mẫu cần nơi dựng truyền handler (dịch vụ dịch đang bật)', () => {
        const flags = resolveMessageActions(withText({ handlers: ALL_HANDLERS }));

        expect(flags.translate).toBe(false);
        expect(flags.createCannedResponse).toBe(false);
        expect(flags.copy).toBe(true);
    });

    it('tin đã xoá hoặc chưa lưu không có thao tác nội dung nào', () => {
        const deleted = resolveMessageActions(withText({ contentAttributes: { deleted: true } }));
        expect([deleted.copy, deleted.copyLink, deleted.translate]).toEqual([false, false, false]);

        expect(resolveMessageActions(withText({ id: -4 })).copyLink).toBe(false);
    });
});

describe('groupMessageActions — một nguồn danh sách cho mọi menu', () => {
    it('chia ba nhóm theo thứ tự, thu hồi/xoá luôn ở nhóm cuối riêng', () => {
        const flags = resolveMessageActions(
            input({
                messageType: 1,
                content: 'Chào anh',
                inboxCapabilities: ['outbound_reply_to', 'outbound_recall'],
                handlers: { ...ALL_HANDLERS, createCannedResponse: true, translate: true },
            }),
        );

        expect(groupMessageActions(flags).map(group => group.map(action => action.id))).toEqual([
            ['reply', 'forward'],
            ['copy', 'copyLink', 'createCannedResponse', 'translate'],
            ['delete'],
        ]);
    });

    it('bỏ nhóm rỗng thay vì vẽ vạch ngăn thừa', () => {
        const flags = resolveMessageActions(input({ messageType: 0, content: null, inboxCapabilities: [], handlers: { ...ALL_HANDLERS, forward: false } }));

        expect(groupMessageActions(flags).map(group => group.map(action => action.id))).toEqual([['copyLink']]);
        expect(hasAnyMessageAction(flags)).toBe(true);
    });
});

describe('messagePermalink', () => {
    it('giữ đường dẫn hội thoại, thay toàn bộ tham số bằng id tin', () => {
        expect(messagePermalink('https://yona.vn/app/accounts/1/conversations/9?page=2#x', 55, 'messageId')).toBe(
            'https://yona.vn/app/accounts/1/conversations/9?messageId=55',
        );
    });
});

describe('resolveMessageActions — sao chép hình ảnh', () => {
    it('chỉ bật khi tin có đúng một ảnh sao chép được và chưa bị xoá', () => {
        expect(resolveMessageActions(input({ hasCopyableImage: true })).copyImage).toBe(true);
        expect(resolveMessageActions(input()).copyImage).toBe(false);
        expect(resolveMessageActions(input({ hasCopyableImage: true, contentAttributes: { deleted: true } })).copyImage).toBe(false);
    });

    it('nằm cùng nhóm nội dung với sao chép chữ', () => {
        const flags = resolveMessageActions(input({ hasCopyableImage: true, content: 'chữ' }));
        const ids = groupMessageActions(flags).flat().map(action => action.id);

        expect(ids).toEqual(expect.arrayContaining(['copy', 'copyImage']));
        expect(ids.indexOf('copy')).toBeLessThan(ids.indexOf('copyImage'));
    });
});

describe('resolveMessageActions — mở tại nền tảng gốc', () => {
    it('chỉ bật khi kênh khai đường mở tin và tin chưa bị xoá', () => {
        expect(resolveMessageActions(input({ hasSourceLink: true })).openSource).toBe(true);
        expect(resolveMessageActions(input()).openSource).toBe(false);
        expect(resolveMessageActions(input({ hasSourceLink: true, contentAttributes: { deleted: true } })).openSource).toBe(false);
    });

    it('đứng ngay sau sao chép liên kết trong nhóm nội dung', () => {
        const ids = groupMessageActions(resolveMessageActions(input({ hasSourceLink: true }))).flat().map(action => action.id);

        expect(ids.indexOf('openSource')).toBe(ids.indexOf('copyLink') + 1);
    });
});
