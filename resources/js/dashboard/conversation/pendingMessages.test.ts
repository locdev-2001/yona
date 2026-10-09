import { describe, expect, it } from 'vitest';

import { markUnsentFailed, markUnsentSending, pendingAttachments, removeUnsent } from './pendingMessages';
import { applyIncomingMessage } from './realtimeReducers';
import type { ConversationMessage } from './types';

function message(id: number, patch: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: 'Dạ shop gửi ảnh',
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: id < 0 ? 'progress' : 'sent',
        content_attributes: {},
        created_at: 100,
        private: false,
        source_id: null,
        ...patch,
    };
}

const pending = message(-3, { echo_id: 'echo-3' });
const fromServer = message(501, { echo_id: 'echo-3' });

describe('tin tạm của khung chat', () => {
    it.each([
        ['realtime tới trước phản hồi', [fromServer, fromServer]],
        ['phản hồi tới trước realtime', [fromServer, { ...fromServer, status: 'delivered' }]],
    ])('%s: chỉ còn một tin, đúng chỗ tin tạm', (_order, arrivals) => {
        const result = arrivals.reduce<ConversationMessage[]>(
            (messages, arrival) => applyIncomingMessage(messages, arrival).messages,
            [message(400), pending],
        );

        expect(result.map(item => item.id)).toEqual([400, 501]);
    });

    it('lỗi tới sau khi bản máy chủ đã thay tin tạm thì không đánh dấu hỏng tin thật', () => {
        const replaced = applyIncomingMessage([pending], fromServer).messages;

        expect(markUnsentFailed(replaced, 'echo-3', 'Mạng chập chờn.')).toEqual(replaced);
    });

    it('hỏng rồi gửi lại: lý do lỗi gắn vào tin tạm rồi được gỡ khi gửi lại, nội dung giữ nguyên', () => {
        const failed = markUnsentFailed([pending], 'echo-3', 'Mạng chập chờn.');
        expect(failed[0]).toMatchObject({
            status: 'failed',
            content: 'Dạ shop gửi ảnh',
            content_attributes: { external_error: { message: 'Mạng chập chờn.' } },
        });

        const retrying = markUnsentSending(failed, 'echo-3');
        expect(retrying[0]).toMatchObject({ status: 'progress', content_attributes: {} });
    });

    it('xoá chỉ bỏ tin tạm, không bỏ tin thật mang cùng echo_id', () => {
        expect(removeUnsent([pending, message(400)], 'echo-3').map(item => item.id)).toEqual([400]);
        expect(removeUnsent([fromServer], 'echo-3')).toEqual([fromServer]);
    });

    it.each([
        ['image/png', 'anh.png', 'image'],
        ['video/mp4', 'clip.mp4', 'video'],
        ['audio/webm', 'ghi-am.webm', 'audio'],
        ['application/pdf', 'bao-gia.pdf', 'file'],
    ])('tệp %s (%s) hiện ngay thành đính kèm loại %s', (type, name, fileType) => {
        const file = new File(['x'], name, { type });

        expect(pendingAttachments([{ file, previewUrl: 'data:,' }])[0]).toMatchObject({
            file_type: fileType,
            filename: name,
            data_url: 'data:,',
            file_size: 1,
        });
    });
});
