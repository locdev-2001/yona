import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { draftKey, removeDraft, setDraft } from '../draftApi';

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

describe('ReplyBox · thu gọn khi chưa soạn', () => {
    // Nhóm trên không gỡ ô soạn sau mỗi test; ô soạn còn treo sẽ ghi lại nháp và nghe phím.
    // Nháp còn nằm trong bộ nhớ của draftApi, xoá localStorage chưa đủ.
    beforeEach(() => {
        cleanup();
        removeDraft(draftKey(4, 'REPLY'));
    });
    afterEach(() => cleanup());

    const isExpanded = () => replyBox().dataset.expanded === 'true';
    const editor = () => replyBox().querySelector('.ProseMirror') as HTMLElement;

    it('mở hội thoại chỉ có dòng nhập tin; focus thì bung, bấm ra ngoài khi ô trống thì thu lại', async () => {
        render(<ReplyBox />);
        expect(isExpanded()).toBe(false);

        fireEvent.focus(editor());
        expect(isExpanded()).toBe(true);

        fireEvent.pointerDown(document.body);
        expect(isExpanded()).toBe(false);
    });

    it('bấm vào ô đang thu cho nó bung ra, thì một cú bấm ra ngoài là thu lại ngay', () => {
        render(<ReplyBox />);

        fireEvent.pointerDown(editor());
        fireEvent.focus(editor());
        expect(isExpanded()).toBe(true);

        fireEvent.pointerDown(document.body);
        expect(isExpanded()).toBe(false);
    });

    it('bấm trong ô soạn (kể cả thanh công cụ) không làm thu lại', () => {
        render(<ReplyBox />);
        fireEvent.focus(editor());

        fireEvent.pointerDown(screen.getByRole('button', { name: /Private Note/ }));

        expect(isExpanded()).toBe(true);
    });

    it('còn bản nháp thì giữ nguyên dạng đầy đủ', () => {
        setDraft(draftKey(4, 'REPLY'), 'Dạ shop gửi');
        render(<ReplyBox />);

        fireEvent.pointerDown(document.body);

        expect(isExpanded()).toBe(true);
    });

    it('không đứng ở ô nhập nào mà gõ chữ thì chữ vào ô soạn', async () => {
        render(<ReplyBox />);
        (document.activeElement as HTMLElement | null)?.blur();

        fireEvent.keyDown(document.body, { key: 'D' });

        await waitFor(() => expect(focusedEditor()?.textContent).toBe('D'));
        expect(isExpanded()).toBe(true);
    });

    it('phím tắt có Ctrl/Cmd và gõ trong ô nhập khác thì không cướp sang ô soạn', () => {
        render(<ReplyBox />);
        const otherInput = document.createElement('input');
        document.body.appendChild(otherInput);

        fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
        otherInput.focus();
        fireEvent.keyDown(otherInput, { key: 'a' });

        expect(editor().textContent).toBe('');
        otherInput.remove();
    });
});
