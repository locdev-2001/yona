import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    deleteContactAvatar,
    exportContacts,
    fetchActiveContacts,
    fetchContactAttachments,
    fetchContactsByLabel,
    fetchDataImports,
    importContacts,
} from './api';
import { processContactBulkAction } from './bulkApi';

// Port từ dashboard/api/specs/contacts.spec.js + bulkAction.spec.js — kiểm URL,
// method và body của các lệnh gọi E3 (import/export/active/labels/attachments).
const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

const lastCall = () => fetchMock.mock.calls[0] as [string, RequestInit];

beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ payload: [], meta: { count: 0, current_page: 1 } })));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('#fetchActiveContacts', () => {
    it('gọi GET /contacts/active kèm page + sort', async () => {
        await fetchActiveContacts(2, 3, '-name');

        expect(lastCall()[0]).toBe(
            '/api/v1/accounts/2/contacts/active?include_contact_inboxes=false&page=3&sort=-name',
        );
    });
});

describe('#deleteContactAvatar', () => {
    it('DELETE /contacts/{id}/avatar và trả liên hệ đã xoá ảnh', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ payload: { id: 5, name: 'Lan', thumbnail: '', phone_number: null } }));

        const contact = await deleteContactAvatar(2, 5);

        const [url, init] = lastCall();
        expect(url).toBe('/api/v1/accounts/2/contacts/5/avatar');
        expect(init.method).toBe('DELETE');
        expect(contact).toEqual({ id: 5, name: 'Lan', thumbnail: '', phoneNumber: null });
    });
});

describe('#fetchContactsByLabel', () => {
    it('gửi nhãn qua labels[] và mã hoá URL', async () => {
        await fetchContactsByLabel(2, 'customer support', 1, 'name');

        expect(lastCall()[0]).toBe(
            '/api/v1/accounts/2/contacts?include_contact_inboxes=false&page=1&sort=name&labels[]=customer%20support',
        );
    });
});

describe('#importContacts', () => {
    it('POST multipart với trường import_file', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
        const file = new File(['name,email'], 'contacts.csv', { type: 'text/csv' });

        await importContacts(2, file);

        const [url, init] = lastCall();
        expect(url).toBe('/api/v1/accounts/2/contacts/import');
        expect(init.method).toBe('POST');
        expect(init.body).toBeInstanceOf(FormData);
        expect((init.body as FormData).get('import_file')).toBe(file);
    });
});

describe('#exportContacts', () => {
    it('POST /contacts/export kèm payload lọc và nhãn', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

        await exportContacts(2, { payload: [], label: 'vip' });

        const [url, init] = lastCall();
        expect(url).toBe('/api/v1/accounts/2/contacts/export');
        expect(JSON.parse(init.body as string)).toEqual({ payload: [], label: 'vip' });
    });
});

describe('#fetchDataImports', () => {
    it('camelize payload của GET /data_imports', async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                payload: [
                    {
                        id: 7,
                        data_type: 'contacts',
                        status: 'completed_with_errors',
                        total_records: 100,
                        processed_records: 95,
                        failed_records_url: 'http://example.test/failed.csv',
                    },
                ],
            }),
        );

        const imports = await fetchDataImports(2);

        expect(imports[0]).toMatchObject({
            id: 7,
            dataType: 'contacts',
            totalRecords: 100,
            processedRecords: 95,
            failedRecordsUrl: 'http://example.test/failed.csv',
        });
    });
});

describe('#fetchContactAttachments', () => {
    it('gọi GET /contacts/{id}/attachments', async () => {
        await fetchContactAttachments(2, 11);

        expect(lastCall()[0]).toBe('/api/v1/accounts/2/contacts/11/attachments');
    });
});

describe('#processContactBulkAction', () => {
    it('gửi type Contact kèm nhãn cần thêm', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

        await processContactBulkAction(2, { ids: [1, 2], labels: { add: ['vip'] } });

        const [url, init] = lastCall();
        expect(url).toBe('/api/v1/accounts/2/bulk_actions');
        expect(JSON.parse(init.body as string)).toEqual({
            type: 'Contact',
            ids: [1, 2],
            labels: { add: ['vip'] },
        });
    });

    it('gửi action_name delete cho xoá hàng loạt', async () => {
        fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

        await processContactBulkAction(2, { ids: [5], action_name: 'delete' });

        expect(JSON.parse(lastCall()[1].body as string)).toEqual({
            type: 'Contact',
            ids: [5],
            action_name: 'delete',
        });
    });
});
