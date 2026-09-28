import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Ô soạn giả giữ đúng hợp đồng của Editor thật: Enter (không Shift) là gửi tin.
vi.mock('dashboard/components/widgets/WootWriter/Editor', async () => {
    const React = await import('react');

    return {
        default: React.forwardRef(function EditorStub(
            props: { value: string; onChange: (value: string) => void; onSend?: () => void },
            ref: React.Ref<unknown>,
        ) {
            React.useImperativeHandle(ref, () => ({ focusEditorInputField: vi.fn(), insertText: vi.fn() }));

            return (
                <textarea
                    aria-label="editor-stub"
                    value={props.value}
                    onChange={event => props.onChange(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            props.onSend?.();
                        }
                    }}
                />
            );
        }),
    };
});

import ReplyBox from './ReplyBox';
import { STICKER_SUGGESTION_DEBOUNCE_MS } from './useStickerSuggestions';

const SUGGESTIONS_URL = '/api/v1/accounts/2/conversations/4/stickers/suggestions';
const HAHA = { id: 'yona:1', image_url: '/s/haha.webp', pack_id: 'yona:3', label: 'Haha' };
const HIHI = { id: 'yona:2', image_url: '/s/hihi.webp', pack_id: 'yona:3', label: 'Hihi' };

const editor = () => screen.getByLabelText('editor-stub') as HTMLTextAreaElement;
const type = (value: string) => fireEvent.change(editor(), { target: { value } });
const suggestionsRow = () => screen.queryByRole('toolbar', { name: 'Suggested stickers' });
const suggestionCalls = () => getJsonSpy.mock.calls.filter(([url]) => String(url).startsWith(SUGGESTIONS_URL));

async function waitDebounce() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(STICKER_SUGGESTION_DEBOUNCE_MS);
    });
}

describe('ReplyBox — sticker gợi ý khi gõ', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.localStorage.clear();
        sendReplySpy.mockReset();
        sendStickerSpy.mockReset();
        getJsonSpy.mockReset();
        getJsonSpy.mockResolvedValue({ stickers: [HAHA, HIHI] });
        inboxCapabilities.current = ['outbound_sticker'];
    });

    afterEach(() => vi.useRealTimers());

    it('gõ một cụm ngắn thì chờ một nhịp rồi mới hỏi máy chủ, hiện hàng sticker trên ô soạn', async () => {
        render(<ReplyBox />);
        type('haha');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(STICKER_SUGGESTION_DEBOUNCE_MS - 1);
        });
        expect(suggestionCalls()).toHaveLength(0);
        await waitDebounce();

        expect(suggestionCalls()).toHaveLength(1);
        expect(suggestionCalls()[0][0]).toBe(`${SUGGESTIONS_URL}?q=haha`);
        expect(suggestionCalls()[0][1].signal).toBeInstanceOf(AbortSignal);
        const row = suggestionsRow()!;
        expect(within(row).getByRole('button', { name: 'Haha' }).querySelector('img')).toHaveAttribute('src', '/s/haha.webp');
        expect(editor().value).toBe('haha');
    });

    it('gõ liên tục chỉ hỏi một lần với cụm cuối', async () => {
        render(<ReplyBox />);
        type('ha');
        type('hah');
        type('haha');
        await waitDebounce();

        expect(suggestionCalls().map(([url]) => url)).toEqual([`${SUGGESTIONS_URL}?q=haha`]);
    });

    it('cụm đổi khi lượt hỏi cũ chưa về thì huỷ lượt cũ, kết quả trễ không đè kết quả mới', async () => {
        let resolveFirst: (value: unknown) => void = () => undefined;
        getJsonSpy
            .mockImplementationOnce(() => new Promise(resolve => (resolveFirst = resolve)))
            .mockResolvedValueOnce({ stickers: [HIHI] });
        render(<ReplyBox />);

        type('haha');
        await waitDebounce();
        const firstSignal = suggestionCalls()[0][1].signal as AbortSignal;
        type('hihi');
        expect(firstSignal.aborted).toBe(true);
        await waitDebounce();

        await act(async () => resolveFirst({ stickers: [HAHA] }));
        const row = suggestionsRow()!;
        expect(within(row).getByRole('button', { name: 'Hihi' })).toBeInTheDocument();
        expect(within(row).queryByRole('button', { name: 'Haha' })).toBeNull();
    });

    it('gõ tiếp không còn khớp thì hàng gợi ý ẩn', async () => {
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();
        expect(suggestionsRow()).not.toBeNull();

        getJsonSpy.mockResolvedValue({ stickers: [] });
        type('hahaxyz');
        await waitDebounce();

        expect(suggestionsRow()).toBeNull();
    });

    it('bấm sticker gợi ý thì gửi đúng đường gửi sticker và sticker thay cho cụm chữ', async () => {
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();

        fireEvent.click(within(suggestionsRow()!).getByRole('button', { name: 'Hihi' }));

        expect(sendStickerSpy).toHaveBeenCalledWith(HIHI);
        expect(sendReplySpy).not.toHaveBeenCalled();
        expect(editor().value).toBe('');
        expect(suggestionsRow()).toBeNull();
    });

    it('Enter trong ô soạn vẫn gửi tin chữ khi hàng gợi ý đang hiện', async () => {
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();
        expect(suggestionsRow()).not.toBeNull();

        fireEvent.keyDown(editor(), { key: 'Enter' });

        expect(sendReplySpy).toHaveBeenCalledWith(expect.objectContaining({ content: 'haha' }));
        expect(sendStickerSpy).not.toHaveBeenCalled();
    });

    it('bàn phím: mũi tên đổi sticker trong hàng, Enter gửi sticker đang chọn', async () => {
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();
        const row = suggestionsRow()!;
        const [first, second] = within(row).getAllByRole('button', { name: /Haha|Hihi/ });
        expect(first).toHaveAttribute('tabindex', '0');
        expect(second).toHaveAttribute('tabindex', '-1');

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowRight' });
        expect(second).toHaveFocus();
        fireEvent.keyDown(second, { key: 'Enter' });

        expect(sendStickerSpy).toHaveBeenCalledWith(HIHI);
        expect(sendReplySpy).not.toHaveBeenCalled();
    });

    it('Esc trong ô soạn hay nút đóng thì ẩn gợi ý của cụm này, chữ đang gõ còn nguyên', async () => {
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();

        fireEvent.keyDown(editor(), { key: 'Escape' });
        expect(suggestionsRow()).toBeNull();
        expect(editor().value).toBe('haha');

        type('hihi');
        await waitDebounce();
        fireEvent.click(screen.getByRole('button', { name: 'Hide suggested stickers' }));
        expect(suggestionsRow()).toBeNull();
        expect(editor().value).toBe('hihi');
    });

    it('không hỏi khi cụm quá ngắn, quá dài, nhiều dòng, ở Lưu ý riêng hay kênh không gửi được sticker', async () => {
        const { unmount } = render(<ReplyBox />);
        for (const value of ['h', 'Dạ shop gửi mình báo giá nhé', 'haha\nhihi']) {
            type(value);
            await waitDebounce();
        }
        fireEvent.click(screen.getByRole('button', { name: /Private Note/ }));
        type('haha');
        await waitDebounce();
        unmount();

        inboxCapabilities.current = ['outbound_text'];
        render(<ReplyBox />);
        type('haha');
        await waitDebounce();

        expect(suggestionCalls()).toHaveLength(0);
    });
});
