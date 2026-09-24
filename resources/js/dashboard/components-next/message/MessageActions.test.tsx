import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { groupReactions, readReactions } from './helpers/reactions';

const BASE_TIME = 1756707112;

function outgoing(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 11,
        content: 'Đã nhận đơn ạ',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: BASE_TIME,
        private: false,
        source_id: 'zalo-1',
        sender: { id: 3, name: 'Lộc', type: 'user', thumbnail: '' },
        sender_id: 3,
        sender_type: 'User',
        ...overrides,
    };
}

const renderMessage = (
    payload: ConversationMessage,
    capabilities: string[],
    handlers: {
        onToggleReaction?: () => void;
        onDeleteMessage?: () => void;
        onReplyTo?: (message: ConversationMessage) => void;
        onForward?: (message: ConversationMessage) => void;
    } = {},
) =>
    render(
        <Message
            message={payload}
            channelType="Channel::Zalo"
            inboxCapabilities={capabilities}
            onToggleReaction={handlers.onToggleReaction}
            onDeleteMessage={handlers.onDeleteMessage}
            onReplyTo={handlers.onReplyTo}
            onForward={handlers.onForward}
        />,
    ).container;

// jsdom chưa cài đặt <dialog>; Dialog của port mở/đóng bằng showModal/close.
beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
    };
});

const confirmButtonLabelled = (container: HTMLElement, label: string) =>
    Array.from(container.querySelectorAll('dialog button')).find(
        button => button.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;

describe('thanh hành động trên tin gate theo năng lực kênh', () => {
    const handlers = { onToggleReaction: vi.fn(), onDeleteMessage: vi.fn() };

    it('kênh chưa khai năng lực thì không có nút cảm xúc, chỉ còn "Xoá" một chiều như bản gốc', () => {
        renderMessage(outgoing(), [], handlers);

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull();
    });

    it('hiện nút thả cảm xúc khi kênh khai outbound_reaction', () => {
        renderMessage(outgoing(), ['outbound_reaction'], handlers);

        expect(screen.getByRole('button', { name: 'React' })).not.toBeNull();
    });

    it('nhãn "thu hồi" chỉ khi kênh khai outbound_recall, ngược lại là "xoá"', () => {
        const withRecall = renderMessage(outgoing(), ['outbound_recall'], handlers);
        expect(withRecall.querySelector('[aria-label="Unsend for everyone"]')).not.toBeNull();

        const withoutRecall = renderMessage(outgoing(), ['outbound_reaction'], handlers);
        expect(withoutRecall.querySelector('[aria-label="Delete"]')).not.toBeNull();
    });

    it('bấm emoji trong bộ chọn nhanh gọi handler', () => {
        const onToggleReaction = vi.fn();
        renderMessage(outgoing(), ['outbound_reaction'], { onToggleReaction });

        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        fireEvent.click(screen.getByRole('button', { name: '👍' }));

        expect(onToggleReaction).toHaveBeenCalledTimes(1);
    });

    it('bấm "thu hồi" chỉ mở hộp xác nhận, chưa gọi handler', () => {
        const onDeleteMessage = vi.fn();
        const container = renderMessage(outgoing(), ['outbound_recall'], { onDeleteMessage });

        expect(container.querySelector('dialog')).toBeNull();

        fireEvent.click(container.querySelector('[aria-label="Unsend for everyone"]') as HTMLElement);

        expect(onDeleteMessage).not.toHaveBeenCalled();
        expect(container.querySelector('dialog')?.textContent).toContain(
            'Unsend this message for everyone?',
        );
        expect(container.querySelector('dialog')?.textContent).toContain('cannot be undone');
    });

    it('xác nhận rồi mới thu hồi, huỷ thì không đụng gì', () => {
        const onDeleteMessage = vi.fn();
        const container = renderMessage(outgoing(), ['outbound_recall'], { onDeleteMessage });

        fireEvent.click(container.querySelector('[aria-label="Unsend for everyone"]') as HTMLElement);
        fireEvent.click(confirmButtonLabelled(container, 'Cancel') as HTMLButtonElement);

        expect(onDeleteMessage).not.toHaveBeenCalled();
        expect(container.querySelector('dialog')).toBeNull();

        fireEvent.click(container.querySelector('[aria-label="Unsend for everyone"]') as HTMLElement);
        fireEvent.click(confirmButtonLabelled(container, 'Unsend for everyone') as HTMLButtonElement);

        expect(onDeleteMessage).toHaveBeenCalledTimes(1);
        expect(container.querySelector('dialog')).toBeNull();
    });

    it('kênh không thu hồi được thì hỏi bằng câu "xoá" của bản gốc', () => {
        const onDeleteMessage = vi.fn();
        const container = renderMessage(outgoing(), [], { onDeleteMessage });

        fireEvent.click(container.querySelector('[aria-label="Delete"]') as HTMLElement);

        expect(container.querySelector('dialog')?.textContent).toContain(
            'Are you sure you want to delete this message?',
        );

        fireEvent.click(confirmButtonLabelled(container, 'Delete') as HTMLButtonElement);

        expect(onDeleteMessage).toHaveBeenCalledTimes(1);
    });

    it('tin đã thu hồi thì không cho thả cảm xúc nữa', () => {
        renderMessage(outgoing({ content_attributes: { deleted: true } }), ['outbound_reaction'], handlers);

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
    });
});

describe('hàng biểu cảm dưới bong bóng', () => {
    it('gom theo emoji và đếm, không in [object Object] với hình dạng mới', () => {
        const container = renderMessage(
            outgoing({
                content_attributes: {
                    reactions: [
                        { emoji: '👍', by: 'agent:3', at: BASE_TIME },
                        { emoji: '👍', by: '9876543210', at: BASE_TIME },
                        { emoji: '❤️', by: '9876543210', at: BASE_TIME },
                    ],
                },
            }),
            ['outbound_reaction'],
            { onToggleReaction: vi.fn() },
        );

        const row = container.querySelector('[data-yona-reactions]');
        expect(row?.textContent).toBe('👍2❤️');
        expect(row?.textContent).not.toContain('object');
    });

    it('vẫn đọc được bản ghi cũ dạng mảng emoji phẳng', () => {
        expect(groupReactions(readReactions({ reactions: ['👍', '👍', '❤️'] }))).toEqual([
            { emoji: '👍', count: 2, reactedBySelf: false },
            { emoji: '❤️', count: 1, reactedBySelf: false },
        ]);
    });

    it('đánh dấu emoji do phía tenant thả', () => {
        const [group] = groupReactions(readReactions({ reactions: [{ emoji: '👍', by: 'agent:self' }] }));

        expect(group.reactedBySelf).toBe(true);
    });
});

// Máy cảm ứng không rê chuột được: `group-hover` không bao giờ chạy nên thanh hành
// động phải nấp sau nút ⋯ hiện sẵn (finding #8 của audit UX chat 07/09).
describe('thanh hành động trên máy không rê chuột được', () => {
    const originalMatchMedia = window.matchMedia;

    const stubPointer = (isHoverless: boolean) => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(hover: none)' ? isHoverless : false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as unknown as typeof window.matchMedia;
    };

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('hiện nút ⋯ thay cho thanh hành động, bấm mới bung cảm xúc và thu hồi', () => {
        stubPointer(true);
        renderMessage(outgoing(), ['outbound_reaction', 'outbound_recall'], {
            onToggleReaction: vi.fn(),
            onDeleteMessage: vi.fn(),
        });

        const moreButton = screen.getByRole('button', { name: 'More actions' });
        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Unsend for everyone' })).toBeNull();

        fireEvent.click(moreButton);

        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.getByRole('button', { name: 'React' })).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Unsend for everyone' })).not.toBeNull();
    });

    it('thanh ⋯ hiện sẵn (không phụ thuộc rê chuột) trên máy cảm ứng', () => {
        stubPointer(true);
        const container = renderMessage(outgoing(), ['outbound_reaction'], { onToggleReaction: vi.fn() });

        const bar = container.querySelector('button[aria-label="More actions"]')?.parentElement;
        expect(bar?.className).toContain('opacity-60');
        expect(bar?.className).not.toContain('group-hover/message:opacity-100');
    });

    it('máy có chuột giữ nguyên hành vi cũ: không có nút ⋯, thanh ẩn tới khi rê lên tin', () => {
        stubPointer(false);
        const container = renderMessage(outgoing(), ['outbound_reaction'], { onToggleReaction: vi.fn() });

        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        const bar = container.querySelector('button[aria-label="React"]')?.parentElement;
        expect(bar?.className).toContain('group-hover/message:opacity-100');
    });
});

describe('nút Trả lời trên thanh hành động', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('kênh khai outbound_reply_to thì có nút Trả lời và bấm gọi onReplyTo với chính tin đó', () => {
        const onReplyTo = vi.fn();
        const payload = outgoing();
        renderMessage(payload, ['outbound_reply_to'], { onReplyTo });

        fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

        expect(onReplyTo).toHaveBeenCalledTimes(1);
        expect(onReplyTo).toHaveBeenCalledWith(payload);
    });

    it('kênh không khai năng lực thì không có nút Trả lời', () => {
        renderMessage(outgoing(), ['outbound_reaction'], { onReplyTo: vi.fn(), onToggleReaction: vi.fn() });

        expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
    });

    it('ghi chú riêng không trả lời trích dẫn được', () => {
        renderMessage(outgoing({ private: true }), ['outbound_reply_to'], { onReplyTo: vi.fn() });

        expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
    });

    it('thứ tự nút cố định: Trả lời → Cảm xúc → Thu hồi', () => {
        const container = renderMessage(outgoing(), ['outbound_reply_to', 'outbound_reaction', 'outbound_recall'], {
            onReplyTo: vi.fn(),
            onToggleReaction: vi.fn(),
            onDeleteMessage: vi.fn(),
        });

        const labels = Array.from(container.querySelectorAll('.message-bubble-container button[aria-label]')).map(
            button => button.getAttribute('aria-label'),
        );

        expect(labels).toEqual(['Reply', 'React', 'Unsend for everyone']);
    });

    it('máy cảm ứng: Trả lời nằm sau nút ⋯, bấm xong thì thanh thu lại', () => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(hover: none)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })) as unknown as typeof window.matchMedia;
        const onReplyTo = vi.fn();
        renderMessage(outgoing(), ['outbound_reply_to'], { onReplyTo });

        expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

        expect(onReplyTo).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
        expect(screen.getByRole('button', { name: 'More actions' })).not.toBeNull();
    });
});

describe('nút Chuyển tiếp trên thanh hành động', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('có nút Chuyển tiếp dù kênh nguồn không khai năng lực nào; bấm gọi onForward với chính tin đó', () => {
        const onForward = vi.fn();
        const payload = outgoing({ message_type: 0, sender: undefined, sender_type: 'Contact' });
        renderMessage(payload, [], { onForward });

        fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

        expect(onForward).toHaveBeenCalledTimes(1);
        expect(onForward).toHaveBeenCalledWith(payload);
    });

    it('không truyền onForward thì không có nút', () => {
        renderMessage(outgoing(), ['outbound_reaction'], { onToggleReaction: vi.fn() });

        expect(screen.queryByRole('button', { name: 'Forward' })).toBeNull();
    });

    it('ghi chú riêng không chuyển tiếp được', () => {
        renderMessage(outgoing({ private: true }), [], { onForward: vi.fn() });
        expect(screen.queryByRole('button', { name: 'Forward' })).toBeNull();
    });

    it('thứ tự nút cố định: Trả lời → Cảm xúc → Chuyển tiếp → Thu hồi', () => {
        const container = renderMessage(outgoing(), ['outbound_reply_to', 'outbound_reaction', 'outbound_recall'], {
            onReplyTo: vi.fn(),
            onToggleReaction: vi.fn(),
            onDeleteMessage: vi.fn(),
            onForward: vi.fn(),
        });

        const labels = Array.from(container.querySelectorAll('.message-bubble-container button[aria-label]')).map(
            button => button.getAttribute('aria-label'),
        );

        expect(labels).toEqual(['Reply', 'React', 'Forward', 'Unsend for everyone']);
    });

    it('máy cảm ứng: Chuyển tiếp nằm sau nút ⋯, bấm xong thì thanh thu lại', () => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(hover: none)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })) as unknown as typeof window.matchMedia;
        const onForward = vi.fn();
        renderMessage(outgoing(), [], { onForward });

        expect(screen.queryByRole('button', { name: 'Forward' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
        fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

        expect(onForward).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('button', { name: 'Forward' })).toBeNull();
        expect(screen.getByRole('button', { name: 'More actions' })).not.toBeNull();
    });
});
