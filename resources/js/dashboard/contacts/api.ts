// Port từ dashboard/api/contacts.js + phần action tương ứng của store contacts:
// đọc camelize (stopPaths custom_attributes), ghi snakecase (giữ nguyên
// custom_attributes).
import { deleteJson, getJson, postForm, postJson, putForm, putJson } from 'dashboard/helper/apiClient';
import { camelizeKeys, snakeizeKeys } from 'dashboard/helper/transformKeys';
import type { ConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import type { Contact, ContactIdentificationFilter, ContactsMeta } from './types';

interface RawListResponse {
    meta: {
        count: number;
        current_page: number;
        has_more?: boolean;
        identified_count?: number;
        unidentified_count?: number;
    };
    payload: Record<string, unknown>[];
}

export interface ContactsPage {
    contacts: Contact[];
    meta: ContactsMeta;
}

const CAMELIZE_STOP_PATHS = ['custom_attributes'];

const contactsUrl = (accountId: number) => `/api/v1/accounts/${accountId}/contacts`;

export function toClientContact(raw: unknown): Contact {
    return camelizeKeys<Contact>(raw, CAMELIZE_STOP_PATHS);
}

function toApiPayload(contactParams: Record<string, unknown>): Record<string, unknown> {
    const { customAttributes, ...paramsToDecamelize } = contactParams;

    return {
        ...snakeizeKeys<Record<string, unknown>>(paramsToDecamelize),
        ...(customAttributes !== undefined ? { custom_attributes: customAttributes } : {}),
    };
}

function toClientPage(response: RawListResponse): ContactsPage {
    return {
        contacts: response.payload.map(toClientContact),
        meta: {
            count: response.meta.count,
            currentPage: Number(response.meta.current_page),
            hasMore: response.meta.has_more,
            identifiedCount: response.meta.identified_count,
            unidentifiedCount: response.meta.unidentified_count,
        },
    };
}

// Danh sách Bạn bè kèm contact_inboxes để mỗi dòng hiện logo kênh của người đó;
// friendsOnly chỉ lấy người dùng Yona đã kết bạn.
const friendsParam = (friendsOnly: boolean) => (friendsOnly ? '&friends=true' : '');

const identificationParam = (filter: ContactIdentificationFilter) =>
    filter === 'all' ? '' : `&identified=${filter === 'identified'}`;

export async function fetchContacts(
    accountId: number,
    page: number,
    sortAttr: string,
    identification: ContactIdentificationFilter = 'all',
    friendsOnly = false,
): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}?include_contact_inboxes=true&page=${page}&sort=${encodeURIComponent(sortAttr)}${identificationParam(identification)}${friendsParam(friendsOnly)}`,
    );

    return toClientPage(response);
}

// ContactAPI.search
export async function searchContacts(
    accountId: number,
    search: string,
    page: number,
    sortAttr: string,
    friendsOnly = false,
): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}/search?include_contact_inboxes=true&page=${page}&sort=${encodeURIComponent(sortAttr)}&q=${encodeURIComponent(search)}${friendsParam(friendsOnly)}`,
    );

    return toClientPage(response);
}

// ContactAPI.show
export async function fetchContact(accountId: number, contactId: number): Promise<Contact> {
    const response = await getJson<{ payload: Record<string, unknown> }>(`${contactsUrl(accountId)}/${contactId}`);

    return toClientContact(response.payload);
}

// ContactAPI.create — response create.json.jbuilder: payload.contact + contact_inbox.
export async function createContact(accountId: number, contactParams: Record<string, unknown>): Promise<Contact> {
    const response = await postJson<{ payload: { contact: Record<string, unknown> } }>(
        contactsUrl(accountId),
        toApiPayload(contactParams),
    );

    return toClientContact(response.payload.contact);
}

// ContactAPI.update
export async function updateContact(
    accountId: number,
    contactId: number,
    contactParams: Record<string, unknown>,
): Promise<Contact> {
    const response = await putJson<{ payload: Record<string, unknown> }>(
        `${contactsUrl(accountId)}/${contactId}`,
        toApiPayload(contactParams),
    );

    return toClientContact(response.payload);
}

// Upload avatar: bản gốc gửi form-data qua update; ở đây chỉ gửi mỗi file
// (controller validate 'sometimes' nên các field khác giữ nguyên).
export async function updateContactAvatar(accountId: number, contactId: number, avatar: File): Promise<Contact> {
    const form = new FormData();
    form.set('avatar', avatar);

    const response = await putForm<{ payload: Record<string, unknown> }>(
        `${contactsUrl(accountId)}/${contactId}`,
        form,
    );

    return toClientContact(response.payload);
}

// ContactAPI.destroy
export function deleteContact(accountId: number, contactId: number): Promise<unknown> {
    return deleteJson(`${contactsUrl(accountId)}/${contactId}`);
}

// ContactAPI.destroyAvatar — trả liên hệ đã xoá ảnh.
export async function deleteContactAvatar(accountId: number, contactId: number): Promise<Contact> {
    const response = await deleteJson<{ payload: Record<string, unknown> }>(`${contactsUrl(accountId)}/${contactId}/avatar`);

    return toClientContact(response.payload);
}

// ContactAPI.filter — POST /contacts/filter (segment + bộ lọc liên hệ)
export async function filterContacts(
    accountId: number,
    payload: ConversationFilterPayload[],
    page: number,
    sortAttr: string,
): Promise<ContactsPage> {
    const response = await postJson<RawListResponse>(
        `${contactsUrl(accountId)}/filter?page=${page}&sort=${encodeURIComponent(sortAttr)}`,
        { payload },
    );

    return toClientPage(response);
}

// ContactAPI.destroyCustomAttributes — POST /contacts/{id}/destroy_custom_attributes
export async function deleteContactCustomAttributes(
    accountId: number,
    contactId: number,
    customAttributes: string[],
): Promise<Contact> {
    const response = await postJson<{ payload: Record<string, unknown> }>(
        `${contactsUrl(accountId)}/${contactId}/destroy_custom_attributes`,
        { custom_attributes: customAttributes },
    );

    return toClientContact(response.payload);
}

// ContactAPI.active — GET /contacts/active (liên hệ đang online).
export async function fetchActiveContacts(
    accountId: number,
    page: number,
    sortAttr: string,
    friendsOnly = false,
): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}/active?include_contact_inboxes=true&page=${page}&sort=${encodeURIComponent(sortAttr)}${friendsParam(friendsOnly)}`,
    );

    return toClientPage(response);
}

// ContactAPI.get kèm lọc nhãn — GET /contacts?labels[]=…
export async function fetchContactsByLabel(
    accountId: number,
    label: string,
    page: number,
    sortAttr: string,
    identification: ContactIdentificationFilter = 'all',
): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}?include_contact_inboxes=false&page=${page}&sort=${encodeURIComponent(sortAttr)}&labels[]=${encodeURIComponent(label)}${identificationParam(identification)}`,
    );

    return toClientPage(response);
}

// ContactAPI.importContacts — POST /contacts/import (multipart, body rỗng khi thành công).
export function importContacts(accountId: number, file: File): Promise<void> {
    const form = new FormData();
    form.set('import_file', file);

    return postForm(`${contactsUrl(accountId)}/import`, form).then(
        () => undefined,
        (error: unknown) => (error instanceof SyntaxError ? undefined : Promise.reject(error)),
    );
}

// ContactAPI.exportContacts — POST /contacts/export (job nền, gửi email).
export function exportContacts(
    accountId: number,
    query: { payload?: ConversationFilterPayload[]; label?: string },
): Promise<void> {
    return postJson(`${contactsUrl(accountId)}/export`, { ...query }).then(
        () => undefined,
        (error: unknown) => (error instanceof SyntaxError ? undefined : Promise.reject(error)),
    );
}

export interface DataImport {
    id: number;
    name: string;
    dataType: string;
    status: string;
    totalRecords: number | null;
    processedRecords: number | null;
    failedRecordsUrl: string | null;
    createdAt: string | null;
}

// DataImportsAPI.get — GET /data_imports (theo dõi tiến trình lần nhập CSV).
export async function fetchDataImports(accountId: number): Promise<DataImport[]> {
    const response = await getJson<{ payload: Record<string, unknown>[] }>(
        `/api/v1/accounts/${accountId}/data_imports`,
    );

    return (response.payload ?? []).map(item => camelizeKeys<DataImport>(item));
}

// ContactAPI.getAttachments — GET /contacts/{id}/attachments (tab Media).
export interface ContactAttachment {
    id: number;
    message_id: number | null;
    file_type: string;
    data_url?: string | null;
    thumb_url?: string | null;
    file_size?: number | null;
    extension?: string | null;
    width?: number | null;
    height?: number | null;
    created_at?: number | null;
    conversation_id?: number | null;
}

export async function fetchContactAttachments(accountId: number, contactId: number): Promise<ContactAttachment[]> {
    const response = await getJson<{ payload: ContactAttachment[] }>(
        `${contactsUrl(accountId)}/${contactId}/attachments`,
    );

    return response.payload ?? [];
}
