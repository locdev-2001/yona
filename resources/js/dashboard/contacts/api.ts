// Port từ dashboard/api/contacts.js + phần action tương ứng của store contacts:
// đọc camelize (stopPaths custom_attributes), ghi snakecase (giữ nguyên
// custom_attributes) — đúng như actions.js của Chatwoot.
import { deleteJson, getJson, postJson, putForm, putJson } from 'dashboard/helper/apiClient';
import { camelizeKeys, snakeizeKeys } from 'dashboard/helper/transformKeys';
import type { Contact, ContactsMeta } from './types';

interface RawListResponse {
    meta: { count: number; current_page: number; has_more?: boolean };
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
        },
    };
}

// ContactAPI.get — danh sách không kèm contact_inboxes như bản gốc.
export async function fetchContacts(accountId: number, page: number, sortAttr: string): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}?include_contact_inboxes=false&page=${page}&sort=${encodeURIComponent(sortAttr)}`,
    );

    return toClientPage(response);
}

// ContactAPI.search
export async function searchContacts(
    accountId: number,
    search: string,
    page: number,
    sortAttr: string,
): Promise<ContactsPage> {
    const response = await getJson<RawListResponse>(
        `${contactsUrl(accountId)}/search?include_contact_inboxes=false&page=${page}&sort=${encodeURIComponent(sortAttr)}&q=${encodeURIComponent(search)}`,
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

// ContactAPI.destroyAvatar
export function deleteContactAvatar(accountId: number, contactId: number): Promise<unknown> {
    return deleteJson(`${contactsUrl(accountId)}/${contactId}/avatar`);
}
