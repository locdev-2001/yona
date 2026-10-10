import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../../i18n';
import { EMPTY_COMPOSE_DRAFT } from '../compose/composeDraft';
import type { ComposeDraft } from '../compose/composeDraft';

const { sendReplySpy, getJsonSpy, draftState } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    getJsonSpy: vi.fn(),
    draftState: { current: null as unknown },
}));

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

const ZALO = { id: 1, name: 'Zalo shop', channel_type: 'Channel::Zalo', capabilities: ['outbound_text', 'outbound_sticker'] };
const SMS = { id: 2, name: 'SMS shop', channel_type: 'Channel::Sms', capabilities: ['outbound_text'] };

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', message_signature: '' } },
            currentAccount: { id: 2, features: {} },
            inboxes: [ZALO, SMS],
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

vi.mock('../api', () => ({ sendMessage: vi.fn() }));

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        isComposing: true,
        registerDraftComposer: () => () => undefined,
        takeCarriedAttachments: () => [],
        composeDraft: draftState.current,
        selectedConversation: null,
        conversationId: 0,
        accountId: 2,
        messages: [],
        sendReply: sendReplySpy,
        sendSticker: vi.fn(),
        sendStructured: vi.fn(),
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
        assignAgent: vi.fn(),
        toggleStatus: vi.fn(),
    }),
}));

vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: { value: string; disabled?: boolean; placeholder?: string; onChange: (value: string) => void; onSend: () => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <>
                    <textarea
                        aria-label="editor-stub"
                        disabled={props.disabled}
                        placeholder={props.placeholder}
                        value={props.value}
                        onChange={event => props.onChange(event.target.value)}
                    />
                    <button type="button" onClick={props.onSend}>
                        gửi-stub
                    </button>
                </>
            );
        }),
    };
});

import ReplyBox from './ReplyBox';

const draftFor = (inbox: typeof ZALO | null): ComposeDraft => ({
    ...EMPTY_COMPOSE_DRAFT,
    recipient: { kind: 'contact', contact: { id: 9, name: 'Khách A', email: 'khach@example.com' } },
    target: inbox ? { inbox, source_id: 'khach@example.com', display_address: 'khach@example.com', available: true, reason: null } : null,
});

const stickerButton = () => screen.queryByTitle(t('CONVERSATION.REPLYBOX.TIP_STICKER_ICON'));

describe('ReplyBox ở bản nháp hội thoại mới', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sendReplySpy.mockReset();
        getJsonSpy.mockReset();
    });

    it('chưa chọn kênh thì ô soạn khoá kèm gợi ý', () => {
        draftState.current = draftFor(null);
        render(<ReplyBox />);

        const editor = screen.getByLabelText('editor-stub') as HTMLTextAreaElement;
        expect(editor.disabled).toBe(true);
        expect(editor.placeholder).toBe(t('COMPOSE_NEW_CONVERSATION.DRAFT.COMPOSER_LOCKED'));
    });

    it('kênh gửi được sticker thì có nút, kênh chỉ gửi chữ thì không — thanh công cụ theo năng lực kênh đã chọn', () => {
        draftState.current = draftFor(ZALO);
        const { unmount } = render(<ReplyBox />);
        expect(stickerButton()).not.toBeNull();
        unmount();

        draftState.current = draftFor(SMS);
        render(<ReplyBox />);
        expect(stickerButton()).toBeNull();
    });

    it('không có chế độ Lưu ý riêng khi chưa có hội thoại', () => {
        draftState.current = draftFor(ZALO);
        render(<ReplyBox />);

        expect(screen.queryByRole('button', { name: /Private Note|Lưu ý riêng/ })).toBeNull();
    });

    it('bấm gửi thì giao cho đường gửi chung và giữ nội dung tới khi hội thoại mở xong', () => {
        draftState.current = draftFor(ZALO);
        render(<ReplyBox />);
        const editor = screen.getByLabelText('editor-stub') as HTMLTextAreaElement;
        fireEvent.change(editor, { target: { value: 'Chào chị' } });
        fireEvent.click(screen.getByRole('button', { name: 'gửi-stub' }));

        expect(sendReplySpy).toHaveBeenCalledWith(expect.objectContaining({ content: 'Chào chị', isPrivate: false }));
        expect(editor.value).toBe('Chào chị');
    });
});
