import { beforeEach, describe, expect, it, vi } from 'vitest';

const getJson = vi.fn();
vi.mock('dashboard/helper/apiClient', () => ({ getJson: (url: string) => getJson(url) }));

const { searchContacts, searchConversations, searchFiles, searchMessages } = await import('./api');

const FILTERED = { q: 'bao gia', page: 2, since: 100, from: 'contact:5', inboxId: 3 };

function requestedParams(): URLSearchParams {
    const url = String(getJson.mock.calls.at(-1)?.[0]);

    return new URLSearchParams(url.slice(url.indexOf('?') + 1));
}

beforeEach(() => {
    getJson.mockReset();
    getJson.mockResolvedValue({ payload: {} });
});

describe('bộ lọc theo tin', () => {
    it('gửi người gửi và hộp thư cho tệp như cho tin nhắn', async () => {
        await searchFiles(1, FILTERED);
        expect(String(getJson.mock.calls[0][0])).toContain('/api/v1/accounts/1/search/files?');
        expect(Object.fromEntries(requestedParams())).toEqual({
            q: 'bao gia',
            page: '2',
            since: '100',
            from: 'contact:5',
            inbox_id: '3',
        });

        await searchMessages(1, FILTERED);
        expect(requestedParams().get('inbox_id')).toBe('3');
    });

    it('không gửi người gửi và hộp thư cho liên hệ', async () => {
        await searchContacts(1, FILTERED);

        expect(requestedParams().has('from')).toBe(false);
        expect(requestedParams().has('inbox_id')).toBe(false);
        expect(requestedParams().get('since')).toBe('100');
    });
});

describe('khoá của payload', () => {
    it('giữ nguyên khoá snake_case bên trong thuộc tính, tin và đính kèm', async () => {
        getJson.mockResolvedValue({
            payload: {
                files: [
                    {
                        id: 1,
                        message_id: 7,
                        file_name: 'Báo giá.pdf',
                        message: {
                            conversation_id: 12,
                            content_attributes: { sender: { external_id: 'u-1', name: 'Lan Anh' } },
                            attachments: [{ file_type: 'file', data_url: 'x' }],
                        },
                    },
                ],
            },
        });
        const [file] = await searchFiles(1, { q: 'bao' });

        expect(file.messageId).toBe(7);
        expect(file.fileName).toBe('Báo giá.pdf');
        expect(file.message.conversationId).toBe(12);
        expect(file.message.contentAttributes).toEqual({ sender: { external_id: 'u-1', name: 'Lan Anh' } });
        expect(file.message.attachments).toEqual([{ file_type: 'file', data_url: 'x' }]);

        getJson.mockResolvedValue({
            payload: { conversations: [{ id: 3, additional_attributes: { mail_subject: 'Đơn hàng' } }] },
        });
        const [conversation] = await searchConversations(1, { q: 'don' });

        expect(conversation.additionalAttributes).toEqual({ mail_subject: 'Đơn hàng' });
    });
});
