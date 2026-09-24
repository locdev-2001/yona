import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from '../types';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', message_signature: '' } },
            currentAccount: { id: 2, features: {} },
            inboxes: [{ id: 1, name: 'Zalo', channel_type: 'Channel::Zalo', capabilities: ['outbound_reply_to'] }],
        },
    }),
    router: { visit: vi.fn() },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => new Promise(() => undefined),
    postJson: vi.fn(),
    patchJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

vi.mock('../api', () => ({ sendMessage: vi.fn() }));

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        selectedConversation: {
            id: 4,
            inbox_id: 1,
            can_reply: true,
            status: 'open',
            meta: { sender: { id: 3, name: 'Khách A' }, assignee: { id: 1, name: 'Lộc' } },
        },
        conversationId: 4,
        accountId: 2,
        messages: [],
        sendReply: vi.fn(),
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
        assignAgent: vi.fn(),
        toggleStatus: vi.fn(),
    }),
}));

import ReplyBox from './ReplyBox';
import { draftKey, setDraft } from '../draftApi';

// Ô soạn thật (ProseMirror): lỗi chỉ lộ ra khi ô soạn bị dựng lại lúc đổi chế độ.

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

function message(id: number, content: string): ConversationMessage {
    return {
        id,
        content,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
    };
}

const replyBox = () => document.querySelector('.reply-box') as HTMLElement;
const focusedEditor = () => (document.activeElement?.classList.contains('ProseMirror') ? document.activeElement : null);

function switchToNoteThenReplyTo(nextTarget: ConversationMessage) {
    const view = render(<ReplyBox replyTarget={message(7, 'Tin thứ nhất')} onClearReplyTarget={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));
    (document.activeElement as HTMLElement | null)?.blur();
    expect(replyBox().classList.contains('is-private')).toBe(true);

    view.rerender(<ReplyBox replyTarget={nextTarget} onClearReplyTarget={vi.fn()} />);
}

describe('ReplyBox · bấm Trả lời trên bong bóng khi đang ở Lưu ý riêng', () => {
    beforeEach(() => {
        window.localStorage.clear();
        // Trình duyệt thật có thể chạy khung hình kế tiếp trước khi ô soạn được dựng
        // lại theo chế độ mới; chạy ngay lập tức để thứ tự đó luôn xảy ra trong test.
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('về tab Trả lời và con trỏ nằm trong ô soạn Trả lời', async () => {
        switchToNoteThenReplyTo(message(8, 'Tin thứ hai'));

        await waitFor(() => expect(replyBox().classList.contains('is-private')).toBe(false));
        await waitFor(() => expect(focusedEditor()).not.toBeNull());
        expect(replyBox().contains(focusedEditor())).toBe(true);
    });

    it('bản nháp Trả lời đang dở thì con trỏ đứng cuối bản nháp để gõ tiếp', async () => {
        setDraft(draftKey(4, 'REPLY'), 'Dạ shop gửi');

        switchToNoteThenReplyTo(message(8, 'Tin thứ hai'));

        await waitFor(() => expect(focusedEditor()?.textContent).toBe('Dạ shop gửi'));
        const selection = document.getSelection();
        expect(selection?.anchorNode?.textContent).toBe('Dạ shop gửi');
        expect(selection?.anchorOffset).toBe('Dạ shop gửi'.length);
    });
});
