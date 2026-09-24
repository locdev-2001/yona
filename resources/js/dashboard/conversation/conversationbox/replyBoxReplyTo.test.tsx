import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from '../types';

const { sendReplySpy, sendMessageSpy, focusSpy } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    sendMessageSpy: vi.fn(),
    focusSpy: vi.fn(),
}));

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

vi.mock('../api', () => ({ sendMessage: sendMessageSpy }));

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
        sendReply: sendReplySpy,
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
        assignAgent: vi.fn(),
        toggleStatus: vi.fn(),
    }),
}));

// Ô soạn thật dựng ProseMirror; ở đây chỉ cần gõ chữ, gửi và nhận lệnh focus.
vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: { value: string; onChange: (value: string) => void; onSend?: () => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: focusSpy, insertText: vi.fn() }));

            return (
                <div>
                    <textarea
                        aria-label="editor-stub"
                        value={props.value}
                        onChange={event => props.onChange(event.target.value)}
                    />
                    <button type="button" onClick={props.onSend}>
                        send-stub
                    </button>
                </div>
            );
        }),
    };
});

import ReplyBox from './ReplyBox';

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

const typeAndSend = (text: string) => {
    fireEvent.change(screen.getByLabelText('editor-stub'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'send-stub' }));
};

const chip = () => screen.queryByTestId('reply-to-message');

describe('ReplyBox khi đang trả lời một tin', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sendReplySpy.mockReset();
        sendMessageSpy.mockReset();
        focusSpy.mockReset();
    });

    it('hiện khối "Đang trả lời", gửi kèm in_reply_to rồi bỏ tin đang trả lời', () => {
        const onClearReplyTarget = vi.fn();
        render(<ReplyBox replyTarget={message(7, 'Còn hàng không shop?')} onClearReplyTarget={onClearReplyTarget} />);

        expect(chip()?.textContent).toContain('Còn hàng không shop?');

        typeAndSend('Dạ còn ạ');

        expect(sendReplySpy).toHaveBeenCalledWith(
            expect.objectContaining({ content: 'Dạ còn ạ', isPrivate: false, contentAttributes: { in_reply_to: 7 } }),
        );
        expect(onClearReplyTarget).toHaveBeenCalledTimes(1);
    });

    it('Lưu ý riêng thì ẩn khối, gửi không kèm trích dẫn và giữ tin đang trả lời', () => {
        const onClearReplyTarget = vi.fn();
        render(<ReplyBox replyTarget={message(7, 'Còn hàng không shop?')} onClearReplyTarget={onClearReplyTarget} />);

        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));

        expect(chip()).toBeNull();

        typeAndSend('Khách quen, ưu tiên');

        expect(sendReplySpy).toHaveBeenCalledWith(
            expect.objectContaining({ isPrivate: true, contentAttributes: undefined }),
        );
        expect(onClearReplyTarget).not.toHaveBeenCalled();
    });

    it('bấm Trả lời một tin khác khi đang ở Lưu ý riêng thì quay về Trả lời và đưa con trỏ vào ô soạn', async () => {
        const { rerender } = render(<ReplyBox replyTarget={message(7, 'Tin thứ nhất')} onClearReplyTarget={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));
        expect(chip()).toBeNull();

        rerender(<ReplyBox replyTarget={message(8, 'Tin thứ hai')} onClearReplyTarget={vi.fn()} />);

        await waitFor(() => expect(chip()?.textContent).toContain('Tin thứ hai'));
        await waitFor(() => expect(focusSpy).toHaveBeenCalled());
    });

    it('bấm X trên khối thì gọi bỏ trả lời', () => {
        const onClearReplyTarget = vi.fn();
        render(<ReplyBox replyTarget={message(7, 'Còn hàng không shop?')} onClearReplyTarget={onClearReplyTarget} />);

        fireEvent.click(screen.getByRole('button', { name: 'Dismiss reply' }));

        expect(onClearReplyTarget).toHaveBeenCalledTimes(1);
    });
});
