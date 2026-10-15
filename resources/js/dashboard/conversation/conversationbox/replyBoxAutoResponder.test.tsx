import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../i18n';
import type { FloorBlockedReply } from '../ConversationContext';

const { sendReplySpy, conversationState } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    conversationState: {
        floorHeldUntil: null as string | null,
        autoReply: true,
        floorBlockedReply: null as FloorBlockedReply | null,
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', message_signature: '' } },
            currentAccount: { id: 2, features: {} },
            inboxes: [{ id: 1, name: 'Shop chính', channel_type: 'Channel::Zalo', capabilities: [], ai_agent: { id: 9, name: 'Linh', enabled: true } }],
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

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        isComposing: false,
        registerDraftComposer: () => () => undefined,
        takeCarriedAttachments: () => [],
        composeDraft: { recipient: null, target: null, subject: '', emailCheck: { status: 'idle' }, isSending: false, showErrors: false, error: null },
        selectedConversation: {
            id: 4,
            inbox_id: 1,
            can_reply: true,
            status: 'open',
            meta: { sender: { id: 3, name: 'Khách Mèo Mướp' } },
            auto_responder: { enabled: conversationState.autoReply, ai_agent: { id: 9, name: 'Linh' } },
            floor_held_until: conversationState.floorHeldUntil,
        },
        conversationId: 4,
        accountId: 2,
        messages: [],
        sendReply: sendReplySpy,
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
        floorBlockedReply: conversationState.floorBlockedReply,
    }),
}));

vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: { value: string; onChange: (value: string) => void; onSend?: () => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <div>
                    <textarea aria-label="editor-stub" value={props.value} onChange={event => props.onChange(event.target.value)} />
                    <button type="button" onClick={props.onSend}>
                        enter-stub
                    </button>
                </div>
            );
        }),
    };
});

import ReplyBox from './ReplyBox';

const NOW = new Date('2026-10-15T07:00:00Z');
const type = (text: string) => fireEvent.change(screen.getByLabelText('editor-stub'), { target: { value: text } });
const sendButton = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}( \\(|$)`) });

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));
beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    window.localStorage.clear();
    sendReplySpy.mockReset();
    conversationState.floorHeldUntil = null;
    conversationState.autoReply = true;
    conversationState.floorBlockedReply = null;
});
afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    window.localStorage.clear();
});

describe('khung soạn khi AI giữ lượt', () => {
    it('vẫn gõ được, nút Gửi khoá với chữ "Chờ Linh xong…", Enter không gửi', () => {
        conversationState.floorHeldUntil = new Date(NOW.getTime() + 30_000).toISOString();
        render(<ReplyBox />);

        type('Dạ size M còn chị nhé');

        const waitLabel = t('CONVERSATION.AUTO_RESPONDER.COMPOSER_WAIT', { name: 'Linh' });
        expect(sendButton(waitLabel)).toBeDisabled();
        expect(screen.getByTestId('send-lock-hint')).toHaveTextContent(
            t('CONVERSATION.AUTO_RESPONDER.COMPOSER_LOCKED_HINT', { name: 'Linh' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'enter-stub' }));
        expect(sendReplySpy).not.toHaveBeenCalled();
        expect((screen.getByLabelText('editor-stub') as HTMLTextAreaElement).value).toBe('Dạ size M còn chị nhé');
    });

    it('lượt hết hạn thì nút Gửi tự mở, gửi được ngay', () => {
        conversationState.floorHeldUntil = new Date(NOW.getTime() + 5_000).toISOString();
        render(<ReplyBox />);
        type('Dạ size M còn chị nhé');

        act(() => {
            vi.advanceTimersByTime(6_000);
        });

        const send = sendButton(t('CONVERSATION.REPLYBOX.SEND'));
        expect(send).toBeEnabled();
        fireEvent.click(send);
        expect(sendReplySpy).toHaveBeenCalledWith(expect.objectContaining({ content: 'Dạ size M còn chị nhé', isPrivate: false }));
    });

    it('tab ghi chú riêng vẫn gửi được trong lúc AI giữ lượt', () => {
        conversationState.floorHeldUntil = new Date(NOW.getTime() + 30_000).toISOString();
        render(<ReplyBox />);

        fireEvent.click(screen.getByRole('button', { name: new RegExp(t('CONVERSATION.REPLYBOX.PRIVATE_NOTE')) }));
        type('Khách VIP, ưu tiên');
        fireEvent.click(screen.getByRole('button', { name: 'enter-stub' }));

        expect(sendReplySpy).toHaveBeenCalledWith(expect.objectContaining({ content: 'Khách VIP, ưu tiên', isPrivate: true }));
        expect(screen.queryByTestId('send-lock-hint')).toBeNull();
    });
});

describe('khung soạn khi AI tự động đang bật', () => {
    it('có dòng nhắc gửi tin sẽ chuyển sang thủ công; công tắc tắt thì không có', () => {
        const { unmount } = render(<ReplyBox />);
        expect(screen.getByTestId('auto-responder-manual-hint')).toHaveTextContent(
            t('CONVERSATION.AUTO_RESPONDER.COMPOSER_MANUAL_HINT', { name: 'Linh' }),
        );
        unmount();

        conversationState.autoReply = false;
        render(<ReplyBox />);
        expect(screen.queryByTestId('auto-responder-manual-hint')).toBeNull();
    });

    it('tin bị trả lại vì AI vừa giữ lượt (409) được nạp lại vào khung soạn', () => {
        conversationState.floorBlockedReply = { conversationId: 4, content: 'Dạ váy này giá 420.000đ chị nha', nonce: 1 };
        render(<ReplyBox />);

        expect((screen.getByLabelText('editor-stub') as HTMLTextAreaElement).value).toBe('Dạ váy này giá 420.000đ chị nha');
    });
});
