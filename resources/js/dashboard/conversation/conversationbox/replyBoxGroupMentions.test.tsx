import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from '../types';

const { sendReplySpy, sendMessageSpy, getJsonSpy, inboxCapabilities } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    sendMessageSpy: vi.fn(),
    getJsonSpy: vi.fn(),
    inboxCapabilities: { current: ['outbound_reply_to', 'outbound_mention'] as string[] },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', message_signature: '' } },
            currentAccount: { id: 2, features: {} },
            inboxes: [{ id: 1, name: 'Zalo', channel_type: 'Channel::Zalo', capabilities: inboxCapabilities.current }],
        },
    }),
    router: { visit: vi.fn() },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: getJsonSpy,
    postJson: vi.fn(),
    patchJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

vi.mock('../api', () => ({ sendMessage: sendMessageSpy }));

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        isComposing: false,
        composeDraft: { recipient: null, target: null, subject: '', emailCheck: { status: 'idle' }, isSending: false, showErrors: false, error: null },
        selectedConversation: {
            id: 4,
            inbox_id: 1,
            can_reply: true,
            status: 'open',
            meta: { sender: { id: 3, name: 'Nhóm Khách Sỉ' }, assignee: { id: 1, name: 'Lộc' } },
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

// Ô soạn giả: hiện danh sách thành viên nhận được và cho gõ thẳng markdown mà ô soạn
// thật sinh ra sau khi chọn thành viên.
vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: {
                value: string;
                groupMembers?: { external_id: string; name: string }[];
                onChange: (value: string) => void;
                onSend?: () => void;
            },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <div>
                    <ul aria-label="members-stub">
                        {(props.groupMembers ?? []).map(member => (
                            <li key={member.external_id}>{member.name}</li>
                        ))}
                    </ul>
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

const BINH_MARKDOWN = '[@Bình](mention://member/555/B%C3%ACnh) xem giúp đơn 123';
const BINH_MENTION = { external_id: '555', name: 'Bình', offset: 0, length: 5 };

function quotedMessage(): ConversationMessage {
    return {
        id: 7,
        content: 'Đơn này sao rồi?',
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

describe('ReplyBox nhắc tên thành viên nhóm', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sendReplySpy.mockReset();
        sendMessageSpy.mockReset();
        getJsonSpy.mockReset();
        getJsonSpy.mockImplementation((url: string) =>
            url.endsWith('/group_members')
                ? Promise.resolve({ payload: [{ external_id: '555', name: 'Bình', avatar: null }] })
                : new Promise(() => undefined),
        );
        inboxCapabilities.current = ['outbound_reply_to', 'outbound_mention'];
    });

    it('nạp thành viên của hội thoại và đưa cho ô soạn', async () => {
        render(<ReplyBox />);

        await waitFor(() => expect(screen.getByLabelText('members-stub').textContent).toBe('Bình'));
        expect(getJsonSpy).toHaveBeenCalledWith('/api/v1/accounts/2/conversations/4/group_members');
    });

    it('gửi chữ @Tên kèm content_attributes.mentions thay cho link mention', () => {
        render(<ReplyBox />);

        typeAndSend(BINH_MARKDOWN);

        expect(sendReplySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                content: '@Bình xem giúp đơn 123',
                isPrivate: false,
                contentAttributes: { mentions: [BINH_MENTION] },
            }),
        );
    });

    it('trả lời trích dẫn và nhắc tên cùng lúc → một object content_attributes', () => {
        render(<ReplyBox replyTarget={quotedMessage()} onClearReplyTarget={vi.fn()} />);

        typeAndSend(BINH_MARKDOWN);

        expect(sendReplySpy).toHaveBeenCalledWith(
            expect.objectContaining({ contentAttributes: { in_reply_to: 7, mentions: [BINH_MENTION] } }),
        );
    });

    it('Lưu ý riêng giữ nguyên markdown, không mang mentions', () => {
        render(<ReplyBox />);
        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));

        typeAndSend(BINH_MARKDOWN);

        expect(sendReplySpy).toHaveBeenCalledWith(
            expect.objectContaining({ content: BINH_MARKDOWN, isPrivate: true, contentAttributes: undefined }),
        );
    });

    it('kênh không khai outbound_mention thì không hỏi danh sách thành viên', () => {
        inboxCapabilities.current = ['outbound_reply_to'];
        render(<ReplyBox />);

        expect(getJsonSpy).not.toHaveBeenCalledWith(expect.stringContaining('/group_members'));
        expect(screen.getByLabelText('members-stub').textContent).toBe('');
    });
});
