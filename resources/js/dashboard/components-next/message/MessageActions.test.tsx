import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { groupReactions, readReactions } from './helpers/reactions';
import { LONG_PRESS_MS } from './MessageActions';

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
        onCreateCannedResponse?: (message: ConversationMessage) => void;
        onTranslate?: (message: ConversationMessage) => void;
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
            onCreateCannedResponse={handlers.onCreateCannedResponse}
            onTranslate={handlers.onTranslate}
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
    vi.useRealTimers();
});

const ALL_CAPABILITIES = ['outbound_reaction', 'outbound_reply_to', 'outbound_recall'];

const allHandlers = () => ({
    onToggleReaction: vi.fn(),
    onDeleteMessage: vi.fn(),
    onReplyTo: vi.fn(),
    onForward: vi.fn(),
    onCreateCannedResponse: vi.fn(),
});

const bubbleOf = (container: HTMLElement) =>
    container.querySelector('[data-message-id] [class*="grid-area:bubble"]') as HTMLElement;

const menuLabels = () =>
    screen.getAllByRole('menuitem').map(item => item.textContent?.trim());

const openMoreMenu = () => fireEvent.click(screen.getByRole('button', { name: 'More actions' }));

describe('thanh rê chuột gọn: cảm xúc, trả lời, ⋯', () => {
    it('chỉ còn ba nút theo thứ tự cố định, thao tác khác nằm trong menu', () => {
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

        const bar = container.querySelector('[data-testid="message-action-bar"]') as HTMLElement;
        const labels = Array.from(bar.querySelectorAll(':scope > button')).map(button =>
            button.getAttribute('aria-label'),
        );
        expect(labels).toEqual(['React', 'Reply', 'More actions']);
    });

    it('vùng bấm 32px và có tooltip', () => {
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

        container.querySelectorAll('[data-testid="message-action-bar"] > button').forEach(button => {
            expect(button.className).toContain('size-8');
            expect(button.getAttribute('title')).toBe(button.getAttribute('aria-label'));
        });
    });

    it('ẩn tới khi rê lên tin hoặc focus bằng bàn phím', () => {
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

        const bar = container.querySelector('[data-testid="message-action-bar"]') as HTMLElement;
        expect(bar.className).toContain('group-hover/message:opacity-100');
        expect(bar.className).toContain('focus-within:opacity-100');
    });

    it('kênh không khai năng lực nào thì không có nút cảm xúc và trả lời, vẫn còn ⋯', () => {
        renderMessage(outgoing(), [], allHandlers());

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull();
        expect(screen.getByRole('button', { name: 'More actions' })).not.toBeNull();
    });

    it('bấm Trả lời gọi onReplyTo với chính tin đó', () => {
        const handlers = allHandlers();
        const payload = outgoing();
        renderMessage(payload, ALL_CAPABILITIES, handlers);

        fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

        expect(handlers.onReplyTo).toHaveBeenCalledWith(payload);
    });

    it('bấm emoji trong bộ chọn nhanh gọi handler', () => {
        const handlers = allHandlers();
        renderMessage(outgoing(), ALL_CAPABILITIES, handlers);

        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        fireEvent.click(screen.getByRole('button', { name: '👍' }));

        expect(handlers.onToggleReaction).toHaveBeenCalledTimes(1);
    });

    it('tin đã thu hồi thì không cho thả cảm xúc nữa', () => {
        renderMessage(outgoing({ content_attributes: { deleted: true } }), ALL_CAPABILITIES, allHandlers());

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
    });
});

describe('menu ⋯ và menu chuột phải là một', () => {
    it('nhóm Trả lời, Chuyển tiếp | nội dung | Thu hồi tách riêng chữ đỏ', () => {
        renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

        openMoreMenu();

        expect(menuLabels()).toEqual([
            'Reply',
            'Forward',
            'Copy text',
            'Copy link to message',
            'Create canned response',
            'Unsend for everyone',
        ]);
        expect(screen.getAllByRole('separator')).toHaveLength(2);
        const danger = screen.getByRole('menuitem', { name: 'Unsend for everyone' });
        expect(danger.className).toContain('text-n-ruby-11');
    });

    it('chuột phải vào bong bóng mở đúng menu đó', () => {
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());
        openMoreMenu();
        const fromMoreButton = menuLabels();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();

        const isNativeMenuAllowed = fireEvent.contextMenu(bubbleOf(container).firstElementChild as HTMLElement, {
            clientX: 40,
            clientY: 50,
        });

        expect(isNativeMenuAllowed).toBe(false);
        expect(menuLabels()).toEqual(fromMoreButton);
    });

    it('thao tác kênh không hỗ trợ thì ẩn hẳn, không hiện mờ', () => {
        renderMessage(outgoing(), [], allHandlers());

        openMoreMenu();

        expect(menuLabels()).not.toContain('Reply');
        expect(menuLabels()).toContain('Delete');
        expect(screen.queryByRole('menuitem', { name: 'Unsend for everyone' })).toBeNull();
    });

    it('Dịch chỉ hiện khi nơi dựng có dịch vụ dịch', () => {
        renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());
        openMoreMenu();
        expect(screen.queryByRole('menuitem', { name: 'Translate' })).toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });

        const onTranslate = vi.fn();
        const payload = outgoing({ id: 12 });
        renderMessage(payload, ALL_CAPABILITIES, { ...allHandlers(), onTranslate });
        fireEvent.click(screen.getAllByRole('button', { name: 'More actions' })[1]);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Translate' }));

        expect(onTranslate).toHaveBeenCalledWith(payload);
    });

    it('Tạo câu trả lời mẫu gọi handler với chính tin đó', () => {
        const handlers = allHandlers();
        const payload = outgoing();
        renderMessage(payload, ALL_CAPABILITIES, handlers);

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Create canned response' }));

        expect(handlers.onCreateCannedResponse).toHaveBeenCalledWith(payload);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('Chuyển tiếp có cả khi kênh nguồn không khai năng lực nào', () => {
        const handlers = allHandlers();
        const payload = outgoing();
        renderMessage(payload, [], handlers);

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Forward' }));

        expect(handlers.onForward).toHaveBeenCalledWith(payload);
    });

    it('ghi chú riêng không trả lời, không chuyển tiếp được', () => {
        renderMessage(outgoing({ private: true }), ALL_CAPABILITIES, allHandlers());

        openMoreMenu();

        expect(menuLabels()).not.toContain('Reply');
        expect(menuLabels()).not.toContain('Forward');
    });

    describe('sao chép', () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        beforeEach(() => {
            writeText.mockClear();
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        });

        it('Sao chép nội dung chép đúng chữ của tin', () => {
            renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

            openMoreMenu();
            fireEvent.click(screen.getByRole('menuitem', { name: 'Copy text' }));

            expect(writeText).toHaveBeenCalledWith('Đã nhận đơn ạ');
        });

        it('Sao chép liên kết mở hội thoại tại đúng tin (tham số messageId)', () => {
            window.history.replaceState({}, '', '/app/accounts/1/conversations/2?foo=bar');
            renderMessage(outgoing({ id: 77 }), ALL_CAPABILITIES, allHandlers());

            openMoreMenu();
            fireEvent.click(screen.getByRole('menuitem', { name: 'Copy link to message' }));

            expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/app/accounts/1/conversations/2?messageId=77`);
        });

        it('tin chỉ có tệp, không có chữ thì không có Sao chép nội dung', () => {
            renderMessage(
                outgoing({
                    content: null,
                    attachments: [{ id: 1, file_type: 'file', data_url: '/f.pdf', file_size: 10, extension: 'pdf' }],
                } as unknown as Partial<ConversationMessage>),
                ALL_CAPABILITIES,
                allHandlers(),
            );

            openMoreMenu();

            expect(menuLabels()).not.toContain('Copy text');
            expect(menuLabels()).toContain('Copy link to message');
        });
    });

    it('bàn phím: mở bằng ⋯, mũi tên đi giữa các mục, Esc đóng và trả focus về ⋯', () => {
        renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());
        const moreButton = screen.getByRole('button', { name: 'More actions' });

        fireEvent.click(moreButton);
        const menu = screen.getByRole('menu');
        expect(moreButton.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement?.textContent).toBe('Reply');

        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        expect(document.activeElement?.textContent).toBe('Forward');
        fireEvent.keyDown(menu, { key: 'ArrowUp' });
        fireEvent.keyDown(menu, { key: 'ArrowUp' });
        expect(document.activeElement?.textContent).toBe('Unsend for everyone');

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(moreButton);
    });
});

describe('thu hồi và xoá luôn qua hộp xác nhận', () => {
    it('bấm "thu hồi" chỉ mở hộp xác nhận, chưa gọi handler', () => {
        const handlers = allHandlers();
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, handlers);

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Unsend for everyone' }));

        expect(handlers.onDeleteMessage).not.toHaveBeenCalled();
        expect(container.querySelector('dialog')?.textContent).toContain('Unsend this message for everyone?');
        expect(container.querySelector('dialog')?.textContent).toContain('cannot be undone');
    });

    it('xác nhận rồi mới thu hồi, huỷ thì không đụng gì', () => {
        const handlers = allHandlers();
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, handlers);

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Unsend for everyone' }));
        fireEvent.click(confirmButtonLabelled(container, 'Cancel') as HTMLButtonElement);

        expect(handlers.onDeleteMessage).not.toHaveBeenCalled();
        expect(container.querySelector('dialog')).toBeNull();

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Unsend for everyone' }));
        fireEvent.click(confirmButtonLabelled(container, 'Unsend for everyone') as HTMLButtonElement);

        expect(handlers.onDeleteMessage).toHaveBeenCalledTimes(1);
    });

    it('kênh không thu hồi được thì nhãn và câu hỏi là "xoá"', () => {
        const handlers = allHandlers();
        const container = renderMessage(outgoing(), [], handlers);

        openMoreMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

        expect(container.querySelector('dialog')?.textContent).toContain('Are you sure you want to delete this message?');
        fireEvent.click(confirmButtonLabelled(container, 'Delete') as HTMLButtonElement);
        expect(handlers.onDeleteMessage).toHaveBeenCalledTimes(1);
    });

    it('tin đến không có thao tác xoá', () => {
        renderMessage(outgoing({ message_type: 0 }), ALL_CAPABILITIES, allHandlers());

        openMoreMenu();

        expect(menuLabels()).not.toContain('Unsend for everyone');
        expect(menuLabels()).not.toContain('Delete');
    });
});

describe('điện thoại: nhấn giữ mở bottom sheet', () => {
    const touchAt = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });

    it('không còn dấu ⋯ hay thanh thao tác thường trực', () => {
        stubPointer(true);
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());

        expect(container.querySelector('[data-testid="message-action-bar"]')).toBeNull();
        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });

    it('nhấn giữ mở sheet: hàng cảm xúc trên, danh sách thao tác dưới, vùng bấm 44px', () => {
        stubPointer(true);
        vi.useFakeTimers();
        const handlers = allHandlers();
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, handlers);

        fireEvent.touchStart(bubbleOf(container), touchAt(10, 10));
        act(() => {
            vi.advanceTimersByTime(LONG_PRESS_MS);
        });
        fireEvent.touchEnd(bubbleOf(container));

        const sheet = screen.getByRole('dialog', { name: 'More actions' });
        const reactionRow = screen.getByRole('group', { name: 'React' });
        expect(sheet.contains(reactionRow)).toBe(true);
        expect(reactionRow.compareDocumentPosition(screen.getByRole('menu'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        screen.getAllByRole('menuitem').forEach(item => expect(item.className).toContain('min-h-11'));
        reactionRow.querySelectorAll('button').forEach(button => expect(button.className).toContain('size-11'));

        fireEvent.click(screen.getByRole('button', { name: '❤️' }));
        expect(handlers.onToggleReaction).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog', { name: 'More actions' })).toBeNull();
    });

    it('chạm ngắn hoặc kéo để cuộn thì không mở sheet', () => {
        stubPointer(true);
        vi.useFakeTimers();
        const container = renderMessage(outgoing(), ALL_CAPABILITIES, allHandlers());
        const bubble = bubbleOf(container);

        fireEvent.touchStart(bubble, touchAt(10, 10));
        act(() => {
            vi.advanceTimersByTime(LONG_PRESS_MS / 2);
        });
        fireEvent.touchEnd(bubble);
        act(() => {
            vi.advanceTimersByTime(LONG_PRESS_MS);
        });
        expect(screen.queryByRole('menu')).toBeNull();

        fireEvent.touchStart(bubble, touchAt(10, 10));
        fireEvent.touchMove(bubble, touchAt(10, 60));
        act(() => {
            vi.advanceTimersByTime(LONG_PRESS_MS);
        });
        expect(screen.queryByRole('menu')).toBeNull();
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

