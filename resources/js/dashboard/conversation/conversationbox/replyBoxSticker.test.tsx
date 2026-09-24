import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../../i18n';

const { sendReplySpy, sendStickerSpy, getJsonSpy, inboxCapabilities } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    sendStickerSpy: vi.fn(),
    getJsonSpy: vi.fn(),
    inboxCapabilities: { current: ['outbound_sticker'] as string[] },
}));

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

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
        sendReply: sendReplySpy,
        sendSticker: sendStickerSpy,
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
            props: { value: string; onChange: (value: string) => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <textarea aria-label="editor-stub" value={props.value} onChange={event => props.onChange(event.target.value)} />
            );
        }),
    };
});

import ReplyBox from './ReplyBox';

const STICKER = { id: '98930', image_url: 'https://cdn.zalo.test/98930.webp', pack_id: '61900', label: 'Chào' };

const stickerButton = () => screen.queryByTitle(t('CONVERSATION.REPLYBOX.TIP_STICKER_ICON'));

describe('ReplyBox — gửi sticker', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sendReplySpy.mockReset();
        sendStickerSpy.mockReset();
        getJsonSpy.mockReset();
        getJsonSpy.mockResolvedValue({ source: 'recent', query: null, pack_id: null, stickers: [STICKER], packs: [] });
        inboxCapabilities.current = ['outbound_sticker'];
    });

    it('chọn sticker thì gửi ngay, câu đang gõ dở vẫn còn nguyên', async () => {
        render(<ReplyBox />);
        fireEvent.change(screen.getByLabelText('editor-stub'), { target: { value: 'Dạ shop gửi' } });

        fireEvent.click(stickerButton()!);
        fireEvent.click(await screen.findByRole('button', { name: 'Chào' }));

        expect(getJsonSpy).toHaveBeenCalledWith('/api/v1/accounts/2/conversations/4/stickers');
        expect(sendStickerSpy).toHaveBeenCalledWith(STICKER);
        expect(sendReplySpy).not.toHaveBeenCalled();
        expect((screen.getByLabelText('editor-stub') as HTMLTextAreaElement).value).toBe('Dạ shop gửi');
        await waitFor(() => expect(screen.queryByTestId('sticker-picker')).toBeNull());
    });

    it('Lưu ý riêng thì không có nút sticker; quay lại Trả lời thì có lại', () => {
        render(<ReplyBox />);
        expect(stickerButton()).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));
        expect(stickerButton()).toBeNull();

        // Nút đổi chế độ là một công tắc: bấm lần nữa là về Trả lời.
        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));
        expect(stickerButton()).not.toBeNull();
    });

    it('kênh không khai outbound_sticker thì không có nút', () => {
        inboxCapabilities.current = ['outbound_text'];
        render(<ReplyBox />);

        expect(stickerButton()).toBeNull();
    });
});
