import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendReplySpy, channelType } = vi.hoisted(() => ({
    sendReplySpy: vi.fn(),
    channelType: { current: 'Channel::Zalo' },
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
            inboxes: [{ id: 1, name: 'Hộp thư', channel_type: channelType.current, capabilities: ['outbound_text', 'outbound_image'] }],
        },
    }),
    router: { visit: vi.fn() },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: vi.fn(() => new Promise(() => undefined)),
    postJson: vi.fn(),
    patchJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

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
        sendSticker: vi.fn(),
        sendStructured: vi.fn(),
        uiSettings: {},
        updateUISettings: vi.fn(),
        toggleTypingStatus: vi.fn(),
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

const PHOTO = new File(['png'], 'anh-san-pham.png', { type: 'image/png' });

async function attachPhotoAndType(text: string) {
    render(<ReplyBox />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [PHOTO] } });
    await screen.findByTestId('attachment-tray');
    fireEvent.change(screen.getByLabelText('editor-stub'), { target: { value: text } });
}

// Nút gửi của ô soạn là nút submit cuối khung (menu Gửi thẻ cũng có nút submit).
const sendButton = () => [...document.querySelectorAll<HTMLButtonElement>('.reply-box button[type="submit"]')].at(-1)!;

describe('ReplyBox — gửi tin kèm tệp', () => {
    beforeEach(() => {
        window.localStorage.clear();
        sendReplySpy.mockReset();
    });

    it.each(['Channel::Zalo', 'Channel::Email'])(
        '%s: chữ và tệp đi chung một tin (chữ là chú thích); ô soạn và khay trống ngay',
        async (channel) => {
            channelType.current = channel;
            await attachPhotoAndType('Mẫu này còn size M ạ');

            fireEvent.click(sendButton());

            expect(sendReplySpy).toHaveBeenCalledTimes(1);
            expect(sendReplySpy.mock.calls[0][0]).toMatchObject({
                content: 'Mẫu này còn size M ạ',
                isPrivate: false,
                attachments: [{ file: PHOTO, previewUrl: expect.stringMatching(/^data:/) }],
                isVoiceMessage: false,
            });
            await waitFor(() => expect(screen.queryByTestId('attachment-tray')).toBeNull());
            expect((screen.getByLabelText('editor-stub') as HTMLTextAreaElement).value).toBe('');
        },
    );

    it('chỉ có chữ thì gửi tin chữ không kèm tệp', async () => {
        channelType.current = 'Channel::Zalo';
        render(<ReplyBox />);
        fireEvent.change(screen.getByLabelText('editor-stub'), { target: { value: 'Dạ' } });

        fireEvent.click(sendButton());

        expect(sendReplySpy).toHaveBeenCalledTimes(1);
        expect(sendReplySpy.mock.calls[0][0]).toMatchObject({ content: 'Dạ' });
        expect(sendReplySpy.mock.calls[0][0].attachments).toBeUndefined();
    });

    it('chỉ có tệp thì gửi một tin tệp', async () => {
        channelType.current = 'Channel::Zalo';
        await attachPhotoAndType('');

        fireEvent.click(sendButton());

        expect(sendReplySpy).toHaveBeenCalledTimes(1);
        expect(sendReplySpy.mock.calls[0][0]).toMatchObject({ content: '', attachments: [{ file: PHOTO }] });
    });
});
