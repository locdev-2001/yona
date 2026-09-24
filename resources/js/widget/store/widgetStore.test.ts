import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WidgetApiError } from '../api/client';
import { MESSAGE_TYPE } from '../helpers/constants';
import type { WidgetMessage } from '../types';

const apiMock = vi.hoisted(() => ({
    configListeners: [] as ((config: unknown) => void)[],
    sendAttachments: vi.fn(),
    recallMessage: vi.fn(),
    sendSticker: vi.fn(),
}));

vi.mock('../api/widget', () => ({
    onConfigLoaded: (listener: (config: unknown) => void) => {
        apiMock.configListeners.push(listener);
        return () => undefined;
    },
    sendAttachments: apiMock.sendAttachments,
    recallMessage: apiMock.recallMessage,
    sendSticker: apiMock.sendSticker,
}));

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
});

afterEach(() => vi.useRealTimers());

describe('chính sách nhắn tin của kênh', () => {
    it('lấy hạn thu hồi và danh mục sticker từ cấu hình vừa tải', () => {
        apiMock.configListeners.forEach(listener =>
            listener({
                website_channel_config: {
                    recall_window: 300,
                    stickers: [{ id: 'hi', image_url: '/hi.png', pack_id: null, label: null }],
                },
            }),
        );

        expect(widgetStore.getState().messagingPolicy).toStrictEqual({
            recallWindowSeconds: 300,
            stickers: [{ id: 'hi', image_url: '/hi.png', pack_id: null, label: null }],
        });
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
