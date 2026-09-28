import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WidgetApiError } from '../api/client';
import { MESSAGE_TYPE, WIDGET_BUS_EVENTS } from '../helpers/constants';
import type { WidgetMessage } from '../types';

const apiMock = vi.hoisted(() => ({
    configListeners: [] as ((config: unknown) => void)[],
    sendAttachments: vi.fn(),
    recallMessage: vi.fn(),
    setMessageReaction: vi.fn(),
    sendSticker: vi.fn(),
    sendMessage: vi.fn(),
    fetchContact: vi.fn(),
    setContactCustomAttributes: vi.fn(),
    fetchMessages: vi.fn(),
    fetchConversationAttributes: vi.fn(),
}));

vi.mock('../api/widget', () => ({
    onConfigLoaded: (listener: (config: unknown) => void) => {
        apiMock.configListeners.push(listener);
        return () => undefined;
    },
    sendAttachments: apiMock.sendAttachments,
    recallMessage: apiMock.recallMessage,
    setMessageReaction: apiMock.setMessageReaction,
    sendSticker: apiMock.sendSticker,
    sendMessage: apiMock.sendMessage,
    fetchContact: apiMock.fetchContact,
    setContactCustomAttributes: apiMock.setContactCustomAttributes,
    fetchMessages: apiMock.fetchMessages,
    fetchConversationAttributes: apiMock.fetchConversationAttributes,
}));

const { emitter } = await import('shared/helpers/emitter');
const { widgetStore, splitProgressAcrossFiles } = await import('./widgetStore');

const serverMessage = (overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id: 501,
    content: 'Hai mẫu',
    message_type: MESSAGE_TYPE.INCOMING,
    created_at: 1758000000,
    status: 'sent',
    attachments: [
        { id: 1, file_type: 'image', data_url: '/a.png' },
        { id: 2, file_type: 'image', data_url: '/b.png' },
    ],
    ...overrides,
});

const image = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: 'image/png' });

beforeEach(() => {
    widgetStore.clearConversations();
    apiMock.sendAttachments.mockReset();
    apiMock.recallMessage.mockReset();
    apiMock.sendSticker.mockReset();
    apiMock.sendMessage.mockReset();
    apiMock.fetchContact.mockReset();
    apiMock.setContactCustomAttributes.mockReset();
    apiMock.fetchMessages.mockReset().mockResolvedValue({ payload: [] });
    apiMock.fetchConversationAttributes.mockReset().mockResolvedValue({});
    widgetStore.setChannelConfig(
        {} as never,
        {},
        { id: null, pubsub_token: null, has_email: false, has_name: false, has_phone_number: false },
    );
});

afterEach(() => vi.useRealTimers());

describe('chính sách nhắn tin của kênh', () => {
    it('lấy hạn thu hồi, danh mục sticker và cạnh hiển thị sticker từ cấu hình vừa tải', () => {
        apiMock.configListeners.forEach(listener =>
            listener({
                website_channel_config: {
                    recall_window: 300,
                    stickers: [{ id: 'hi', image_url: '/hi.png', pack_id: null, label: null }],
                    sticker_display_size: 72,
                    reactions: ['👍', '❤️'],
                },
            }),
        );

        expect(widgetStore.getState().messagingPolicy).toStrictEqual({
            recallWindowSeconds: 300,
            stickers: [{ id: 'hi', image_url: '/hi.png', pack_id: null, label: null }],
            stickerDisplaySize: 72,
            reactions: ['👍', '❤️'],
        });
    });
});

describe('cảm xúc của khách', () => {
    const agentMessage = { id: 41, content: 'Dạ còn ạ', message_type: 1, created_at: 1, content_attributes: {} };

    it('hiện ngay trước khi máy chủ trả lời; lỗi thì trả lại như cũ và báo', async () => {
        widgetStore.setChannelConfig({ widgetColor: '#000' } as never, {} as never, { id: 7 } as never);
        widgetStore.addOrUpdateMessage(agentMessage as never);
        let reject: (error: Error) => void = () => undefined;
        apiMock.setMessageReaction.mockReturnValueOnce(new Promise((_, fail) => (reject = fail)));

        const pending = widgetStore.reactToMessage(41, '👍');
        expect(widgetStore.getState().conversations[41].content_attributes?.reactions).toMatchObject([{ emoji: '👍', by: 'contact:7' }]);

        reject(new Error('mạng'));
        await pending;
        expect(widgetStore.getState().conversations[41].content_attributes?.reactions).toEqual([]);
        expect(widgetStore.getState().banner?.type).toBe('error');
    });
});

describe('splitProgressAcrossFiles', () => {
    it('quy tổng byte đã tải về từng tệp theo thứ tự gửi', () => {
        expect(splitProgressAcrossFiles(0, [100, 100])).toStrictEqual([0, 0]);
        expect(splitProgressAcrossFiles(150, [100, 100])).toStrictEqual([100, 50]);
        expect(splitProgressAcrossFiles(500, [100, 100])).toStrictEqual([100, 100]);
    });
});

describe('sendAttachments', () => {
    it('gửi MỘT tin chở mọi tệp kèm chú thích và tin được trả lời, báo tiến trình từng tệp', async () => {
        const files = [image('a.png', 100), image('b.png', 100)];
        const progress: [number, number][] = [];
        let seenWhileUploading: WidgetMessage[] = [];

        apiMock.sendAttachments.mockImplementation(
            async (_params: unknown, _metadata: unknown, onUploadProgress: (loaded: number) => void) => {
                onUploadProgress(150);
                seenWhileUploading = Object.values(widgetStore.getState().conversations);
                return serverMessage();
            },
        );

        await widgetStore.sendAttachments({
            files,
            caption: 'Hai mẫu',
            replyTo: 42,
            onProgress: (fileIndex, percent) => progress.push([fileIndex, percent]),
        });

        expect(apiMock.sendAttachments).toHaveBeenCalledTimes(1);
        expect(apiMock.sendAttachments.mock.calls[0][0]).toStrictEqual({ files, caption: 'Hai mẫu', replyTo: 42 });
        expect(progress).toStrictEqual([
            [0, 100],
            [1, 50],
        ]);
        expect(seenWhileUploading).toHaveLength(1);
        expect(seenWhileUploading[0].status).toBe('in_progress');
        expect(seenWhileUploading[0].attachments?.map(attachment => attachment.progress)).toStrictEqual([100, 50]);

        const messages = Object.values(widgetStore.getState().conversations);
        expect(messages).toHaveLength(1);
        expect(messages[0].id).toBe(501);
    });

    it('lỗi mạng giữ tin tạm ở trạng thái gửi hỏng', async () => {
        apiMock.sendAttachments.mockRejectedValue(new WidgetApiError(0, null));

        await widgetStore.sendAttachments({ files: [image('a.png', 10)] });

        const [message] = Object.values(widgetStore.getState().conversations);
        expect(message.status).toBe('failed');
    });

    it('khách huỷ tệp đang tải: dừng yêu cầu, gỡ tin tạm, không báo gửi hỏng', async () => {
        let uploadSignal: AbortSignal | undefined;
        apiMock.sendAttachments.mockImplementation(
            (_params: unknown, _metadata: unknown, _progress: unknown, signal: AbortSignal) =>
                new Promise((_resolve, reject) => {
                    uploadSignal = signal;
                    signal.addEventListener('abort', () => reject(new WidgetApiError(0, null)));
                }),
        );

        const sending = widgetStore.sendAttachments({ files: [image('bao-gia.pdf', 10)] });
        const [temporary] = Object.values(widgetStore.getState().conversations);
        expect(temporary.attachments?.[0].file_name).toBe('bao-gia.pdf');

        widgetStore.cancelSend(temporary.id);
        await sending;

        expect(uploadSignal?.aborted).toBe(true);
        expect(widgetStore.getState().conversations).toStrictEqual({});
        expect(widgetStore.retryableFailureOf(temporary.id)).toBeUndefined();
    });

    it('huỷ tệp đang tải thì trả lại bộ nhớ của ảnh/tệp xem trước (blob URL)', async () => {
        const createdUrls: string[] = [];
        const revokedUrls: string[] = [];
        const originalUrlApi = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
        URL.createObjectURL = () => {
            createdUrls.push(`blob:http://localhost/xem-truoc-${createdUrls.length}`);
            return createdUrls[createdUrls.length - 1];
        };
        URL.revokeObjectURL = (url: string) => revokedUrls.push(url);
        apiMock.sendAttachments.mockImplementation(
            (_params: unknown, _metadata: unknown, _progress: unknown, signal: AbortSignal) =>
                new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new WidgetApiError(0, null)))),
        );

        const sending = widgetStore.sendAttachments({ files: [image('a.png', 10), image('b.png', 10)] });
        const [temporary] = Object.values(widgetStore.getState().conversations);
        widgetStore.cancelSend(temporary.id);
        await sending;

        URL.createObjectURL = originalUrlApi.create;
        URL.revokeObjectURL = originalUrlApi.revoke;
        expect(createdUrls).toHaveLength(2);
        expect(revokedUrls.sort()).toStrictEqual([...createdUrls].sort());
    });

    it('không có tệp thì không gửi gì', async () => {
        await widgetStore.sendAttachments({ files: [] });

        expect(apiMock.sendAttachments).not.toHaveBeenCalled();
    });
});

describe('recallMessage', () => {
    it('thu hồi thành công để lại tin trong danh sách, đánh dấu đã thu hồi và bỏ đính kèm', async () => {
        widgetStore.addOrUpdateMessage(serverMessage());
        apiMock.recallMessage.mockResolvedValue(null);

        await widgetStore.recallMessage(501);

        expect(apiMock.recallMessage).toHaveBeenCalledWith(501);
        const message = widgetStore.getState().conversations[501];
        expect(message.content_attributes).toStrictEqual({ deleted: true });
        expect(message.attachments).toStrictEqual([]);
    });

    it('quá hạn thì báo đúng lý do và giữ nguyên tin', async () => {
        widgetStore.addOrUpdateMessage(serverMessage());
        apiMock.recallMessage.mockRejectedValue(
            new WidgetApiError(422, { error: 'x', code: 'recall_window_expired' }),
        );

        await expect(widgetStore.recallMessage(501)).rejects.toBeInstanceOf(WidgetApiError);

        expect(widgetStore.getState().banner?.type).toBe('error');
        expect(widgetStore.getState().conversations[501].content_attributes?.deleted).toBeUndefined();
    });

    it('tin bị thu hồi đến qua realtime vẫn nằm lại trong luồng', () => {
        widgetStore.addOrUpdateMessage(serverMessage());
        widgetStore.addOrUpdateMessage(serverMessage({ content_attributes: { deleted: true }, attachments: [] }));

        expect(widgetStore.getState().conversations[501].content_attributes?.deleted).toBe(true);
    });
});

describe('retryMessage', () => {
    const onlyMessage = (): WidgetMessage => {
        const messages = Object.values(widgetStore.getState().conversations);
        expect(messages).toHaveLength(1);
        return messages[0];
    };

    it('tin chữ gửi lại tại chỗ đúng nội dung và tin được trả lời, thành công thì thay bằng tin thật', async () => {
        apiMock.sendMessage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await widgetStore.sendMessage({ content: 'Còn hàng không?', replyTo: 42 });
        const failed = onlyMessage();
        expect(failed.status).toBe('failed');
        expect(widgetStore.retryableFailureOf(failed.id)?.isNetworkFailure).toBe(true);

        let seenWhileRetrying: WidgetMessage[] = [];
        apiMock.sendMessage.mockImplementationOnce(async () => {
            seenWhileRetrying = Object.values(widgetStore.getState().conversations);
            return serverMessage({ id: 700, content: 'Còn hàng không?', attachments: [] });
        });
        await widgetStore.retryMessage(failed.id);

        expect(seenWhileRetrying).toHaveLength(1);
        expect(seenWhileRetrying[0].id).toBe(failed.id);
        expect(seenWhileRetrying[0].status).toBe('in_progress');
        expect(apiMock.sendMessage.mock.calls[1].slice(0, 2)).toStrictEqual(['Còn hàng không?', 42]);
        expect(onlyMessage()).toMatchObject({ id: 700, status: 'sent' });
        expect(widgetStore.retryableFailureOf(failed.id)).toBeUndefined();
    });

    it('nhiều tệp gửi lại đúng tệp, chú thích và tin được trả lời trong một tin', async () => {
        const files = [image('a.png', 100), image('b.png', 100)];
        apiMock.sendAttachments.mockRejectedValueOnce(new WidgetApiError(0, null));
        await widgetStore.sendAttachments({ files, caption: 'Hai mẫu', replyTo: 42 });
        const failed = onlyMessage();
        expect(failed.attachments?.map(attachment => attachment.status)).toStrictEqual(['failed', 'failed']);

        let progressWhileRetrying: (number | undefined)[] = [];
        apiMock.sendAttachments.mockImplementationOnce(
            async (_params: unknown, _metadata: unknown, onUploadProgress: (loaded: number) => void) => {
                progressWhileRetrying = onlyMessage().attachments?.map(attachment => attachment.progress) ?? [];
                onUploadProgress(200);
                return serverMessage();
            },
        );
        await widgetStore.retryMessage(failed.id);

        expect(apiMock.sendAttachments).toHaveBeenCalledTimes(2);
        expect(apiMock.sendAttachments.mock.calls[1][0]).toStrictEqual({ files, caption: 'Hai mẫu', replyTo: 42 });
        expect(apiMock.sendAttachments.mock.calls[1][0].files[0]).toBe(files[0]);
        expect(progressWhileRetrying).toStrictEqual([0, 0]);
        expect(onlyMessage()).toMatchObject({ id: 501, status: 'sent' });
    });

    it('sticker gửi lại đúng mã và tin được trả lời', async () => {
        apiMock.sendSticker.mockRejectedValueOnce(new WidgetApiError(503, null));
        await widgetStore.sendSticker({ stickerId: 'hi', replyTo: 7 });
        const failed = onlyMessage();

        apiMock.sendSticker.mockResolvedValueOnce(
            serverMessage({ id: 800, content_type: 'sticker', attachments: [], content_attributes: { sticker: { id: 'hi' } } }),
        );
        await widgetStore.retryMessage(failed.id);

        expect(apiMock.sendSticker.mock.calls).toStrictEqual([
            ['hi', 7],
            ['hi', 7],
        ]);
        expect(onlyMessage()).toMatchObject({ id: 800, content_type: 'sticker' });
    });

    it('lỗi lại thì về gửi hỏng, vẫn một tin và vẫn thử lại được', async () => {
        apiMock.sendMessage.mockRejectedValue(new WidgetApiError(0, null));
        await widgetStore.sendMessage({ content: 'Alo' });
        const failed = onlyMessage();

        await widgetStore.retryMessage(failed.id);

        expect(apiMock.sendMessage).toHaveBeenCalledTimes(2);
        expect(onlyMessage()).toMatchObject({ id: failed.id, status: 'failed' });
        expect(widgetStore.retryableFailureOf(failed.id)?.isNetworkFailure).toBe(true);
    });

    it('bấm Thử lại hai lần liền chỉ gửi một yêu cầu, không tạo tin trùng', async () => {
        apiMock.sendMessage.mockRejectedValueOnce(new WidgetApiError(0, null));
        await widgetStore.sendMessage({ content: 'Alo' });
        const failed = onlyMessage();

        apiMock.sendMessage.mockResolvedValueOnce(serverMessage({ id: 900, content: 'Alo', attachments: [] }));
        await Promise.all([widgetStore.retryMessage(failed.id), widgetStore.retryMessage(failed.id)]);

        expect(apiMock.sendMessage).toHaveBeenCalledTimes(2);
        expect(onlyMessage().id).toBe(900);
    });

    it('máy chủ từ chối (4xx) vẫn thử lại được nhưng không báo lỗi mạng', async () => {
        apiMock.sendMessage.mockRejectedValueOnce(new WidgetApiError(422, { error: 'invalid' }));
        await widgetStore.sendMessage({ content: 'Alo' });

        expect(widgetStore.retryableFailureOf(onlyMessage().id)?.isNetworkFailure).toBe(false);
    });

    it('xoá hội thoại thì bỏ payload đã giữ; id lạ thì không làm gì', async () => {
        apiMock.sendMessage.mockRejectedValueOnce(new WidgetApiError(0, null));
        await widgetStore.sendMessage({ content: 'Alo' });
        const failedId = onlyMessage().id;

        widgetStore.clearConversations();
        await widgetStore.retryMessage(failedId);
        await widgetStore.retryMessage('khong-co');

        expect(widgetStore.retryableFailureOf(failedId)).toBeUndefined();
        expect(apiMock.sendMessage).toHaveBeenCalledTimes(1);
    });
});

describe('setContactCustomAttributes trên phiên còn treo', () => {
    it('chưa có contact thật thì giữ tại chỗ, KHÔNG gọi API (không được đẻ contact chỉ vì gọi hàm này)', async () => {
        await widgetStore.setContactCustomAttributes({ plan: 'pro' });

        expect(apiMock.setContactCustomAttributes).not.toHaveBeenCalled();
        expect(widgetStore.getState().pendingContactCustomAttributes).toStrictEqual({ plan: 'pro' });
    });

    it('đã có contact thật thì gửi thẳng, không giữ lại', async () => {
        widgetStore.setChannelConfig({} as never, {}, { id: 9, pubsub_token: 'tok', has_email: false, has_name: false, has_phone_number: false });
        apiMock.setContactCustomAttributes.mockResolvedValueOnce({});

        await widgetStore.setContactCustomAttributes({ plan: 'pro' });

        expect(apiMock.setContactCustomAttributes).toHaveBeenCalledWith({ plan: 'pro' });
        expect(widgetStore.getState().pendingContactCustomAttributes).toStrictEqual({});
    });
});

describe('reconnectRealtimeIfPending', () => {
    it('không làm gì khi đã có pubsub_token thật', async () => {
        widgetStore.setChannelConfig({} as never, {}, { id: 9, pubsub_token: 'tok', has_email: false, has_name: false, has_phone_number: false });

        await widgetStore.reconnectRealtimeIfPending();

        expect(apiMock.fetchContact).not.toHaveBeenCalled();
    });

    it('phiên treo có pubsub_token thật thì nối realtime, bù tin/trạng thái và gửi nốt custom attributes đã xếp hàng', async () => {
        await widgetStore.setContactCustomAttributes({ plan: 'pro' });
        apiMock.fetchContact.mockResolvedValueOnce({ id: 9, pubsub_token: 'tok-that' });
        apiMock.setContactCustomAttributes.mockResolvedValueOnce({});
        const tokens: unknown[] = [];
        const onTokenReady = (payload: unknown) => tokens.push(payload);
        emitter.on(WIDGET_BUS_EVENTS.ON_REALTIME_TOKEN_READY, onTokenReady);

        await widgetStore.reconnectRealtimeIfPending();
        emitter.off(WIDGET_BUS_EVENTS.ON_REALTIME_TOKEN_READY, onTokenReady);

        expect(widgetStore.getState().contact?.pubsub_token).toBe('tok-that');
        expect(tokens).toStrictEqual(['tok-that']);
        expect(apiMock.fetchMessages).toHaveBeenCalledTimes(1);
        expect(apiMock.fetchConversationAttributes).toHaveBeenCalledTimes(1);
        expect(apiMock.setContactCustomAttributes).toHaveBeenCalledWith({ plan: 'pro' });
        expect(widgetStore.getState().pendingContactCustomAttributes).toStrictEqual({});
    });

    it('vẫn còn treo (chưa có pubsub_token thật) thì không nối, không bù gì', async () => {
        apiMock.fetchContact.mockResolvedValueOnce({ id: null, pubsub_token: null });

        await widgetStore.reconnectRealtimeIfPending();

        expect(widgetStore.getState().contact?.pubsub_token).toBeFalsy();
        expect(apiMock.fetchMessages).not.toHaveBeenCalled();
    });

    it('gọi liền nhau chỉ gửi một yêu cầu /contact, không nối đúp', async () => {
        apiMock.fetchContact.mockResolvedValue({ id: 9, pubsub_token: 'tok-that' });

        await Promise.all([widgetStore.reconnectRealtimeIfPending(), widgetStore.reconnectRealtimeIfPending()]);

        expect(apiMock.fetchContact).toHaveBeenCalledTimes(1);
    });
});
