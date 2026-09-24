import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationMessage } from '../types';
import { fetchMessages } from '../api';
import { getReplyTarget, setReplyTarget } from '../replyToStore';
import { useMessageReply } from './useMessageReply';

vi.mock('../api', () => ({ fetchMessages: vi.fn() }));

const fetchMessagesMock = vi.mocked(fetchMessages);

function message(id: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: `tin ${id}`,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        ...overrides,
    };
}

function respondWith(found: ConversationMessage[]) {
    return { meta: {} as never, payload: found };
}

interface HookProps {
    conversationId: number;
    messages: ConversationMessage[];
    enabled: boolean;
}

const renderReply = (initialProps: HookProps) =>
    renderHook((props: HookProps) => useMessageReply({ accountId: 1, ...props }), { initialProps });

describe('useMessageReply', () => {
    beforeEach(() => {
        window.localStorage.clear();
        fetchMessagesMock.mockReset();
    });

    it('tra đúng một lần mỗi tin gốc nằm ngoài danh sách, bằng khoảng (id + 1, id)', async () => {
        fetchMessagesMock.mockResolvedValue(respondWith([message(3)]));
        const messages = [
            message(20, { content_attributes: { in_reply_to: 3 } }),
            message(21, { content_attributes: { in_reply_to: 3 } }),
            message(22, { content_attributes: { in_reply_to: 20 } }),
        ];

        const { result, rerender } = renderReply({ conversationId: 4, messages, enabled: true });

        await waitFor(() => expect(result.current.replyTargets.get(3)?.id).toBe(3));
        rerender({ conversationId: 4, messages: [...messages], enabled: true });

        expect(fetchMessagesMock).toHaveBeenCalledTimes(1);
        expect(fetchMessagesMock).toHaveBeenCalledWith(1, 4, 4, 3);
    });

    it('bấm Trả lời thì lưu theo hội thoại và đọc lại được sau reload', () => {
        const messages = [message(20)];
        const { result, unmount } = renderReply({ conversationId: 4, messages, enabled: true });

        act(() => result.current.startReply(messages[0]));

        expect(result.current.replyTarget?.id).toBe(20);
        expect(getReplyTarget(4)).toBe(20);

        unmount();
        const reloaded = renderReply({ conversationId: 4, messages, enabled: true });

        expect(reloaded.result.current.replyTarget?.id).toBe(20);
    });

    it('bỏ trả lời thì xoá khỏi bộ nhớ', () => {
        const messages = [message(20)];
        const { result } = renderReply({ conversationId: 4, messages, enabled: true });

        act(() => result.current.startReply(messages[0]));
        act(() => result.current.clearReply());

        expect(result.current.replyTarget).toBeNull();
        expect(getReplyTarget(4)).toBeNull();
    });

    it('tin đang trả lời đã lưu nằm ngoài trang đang tải thì tra rồi hiện', async () => {
        setReplyTarget(4, 3);
        fetchMessagesMock.mockResolvedValue(respondWith([message(3)]));

        const { result } = renderReply({ conversationId: 4, messages: [message(20)], enabled: true });

        await waitFor(() => expect(result.current.replyTarget?.id).toBe(3));
    });

    it('tin đang trả lời đã lưu mà tra ra không còn thì bị xoá', async () => {
        setReplyTarget(4, 3);
        fetchMessagesMock.mockResolvedValue(respondWith([]));

        const { result } = renderReply({ conversationId: 4, messages: [message(20)], enabled: true });

        await waitFor(() => expect(result.current.replyTargets.get(3)).toBeNull());
        expect(result.current.replyTarget).toBeNull();
        expect(getReplyTarget(4)).toBeNull();
    });

    it('lỗi mạng không xoá tin đang trả lời và không tra lại', async () => {
        setReplyTarget(4, 3);
        fetchMessagesMock.mockRejectedValue(new Error('offline'));

        const { rerender } = renderReply({ conversationId: 4, messages: [message(20)], enabled: true });

        await waitFor(() => expect(fetchMessagesMock).toHaveBeenCalledTimes(1));
        await Promise.resolve();
        rerender({ conversationId: 4, messages: [message(20), message(21)], enabled: true });

        expect(getReplyTarget(4)).toBe(3);
        expect(fetchMessagesMock).toHaveBeenCalledTimes(1);
    });

    it('đổi hội thoại thì làm mới bộ nhớ đệm và bỏ kết quả trễ của hội thoại cũ', async () => {
        let resolveLate: (value: ReturnType<typeof respondWith>) => void = () => undefined;
        fetchMessagesMock.mockImplementationOnce(
            () => new Promise(resolve => {
                resolveLate = resolve;
            }),
        );
        setReplyTarget(5, 30);
        const { result, rerender } = renderReply({
            conversationId: 4,
            messages: [message(20, { content_attributes: { in_reply_to: 3 } })],
            enabled: true,
        });

        rerender({ conversationId: 5, messages: [message(30, { conversation_id: 5 })], enabled: true });

        expect(result.current.replyTarget?.id).toBe(30);

        await act(async () => resolveLate(respondWith([message(3)])));

        expect(result.current.replyTargets.has(3)).toBe(false);
    });

    it('kênh không khai năng lực thì không có tin đang trả lời dù bộ nhớ còn id cũ', () => {
        setReplyTarget(4, 20);

        const { result } = renderReply({ conversationId: 4, messages: [message(20)], enabled: false });

        expect(result.current.replyTarget).toBeNull();
        expect(fetchMessagesMock).not.toHaveBeenCalled();
    });
});
