import { useEffect, useSyncExternalStore } from 'react';

import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';

// Port từ store/modules/attributes.js + api/attributes.js.
// Store vuex → cache module-level + useSyncExternalStore, cùng khuôn với
// composables/useCannedResponses.ts: Settings › Custom Attributes, panel hội thoại,
// sidebar liên hệ và hai provider bộ lọc đọc chung một danh sách; `attributes/get`
// chỉ chạy một lần cho mỗi account.

export type AttributeModel = 'conversation_attribute' | 'contact_attribute' | 'company_attribute';

export type AttributeDisplayType = 'text' | 'number' | 'link' | 'date' | 'list' | 'checkbox';

export interface CustomAttributeDefinition {
    id: number;
    attribute_display_name: string;
    attribute_display_type: AttributeDisplayType;
    attribute_description: string | null;
    attribute_key: string;
    attribute_values: string[];
    attribute_model: AttributeModel;
    regex_pattern?: string | null;
    regex_cue?: string | null;
    default_value?: unknown;
}

// Bản camelCase mà components-next dùng (getConversationAttributes/getContactAttributes
// của gốc chạy qua camelcase-keys).
export interface CamelCustomAttribute {
    id: number;
    attributeDisplayName: string;
    attributeDisplayType: AttributeDisplayType;
    attributeDescription: string | null;
    attributeKey: string;
    attributeValues: string[];
    attributeModel: AttributeModel;
    regexPattern?: string | null;
    regexCue?: string | null;
    value?: unknown;
}

export interface CustomAttributeUiFlags {
    isFetching: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

export interface CustomAttributePayload extends Record<string, unknown> {
    attribute_display_name: string;
    attribute_description: string;
    attribute_model?: number;
    attribute_display_type?: number;
    attribute_values: string[];
    regex_pattern: string | null;
    regex_cue: string | null;
}

const EMPTY_RECORDS: CustomAttributeDefinition[] = [];

let records: CustomAttributeDefinition[] = EMPTY_RECORDS;
let uiFlags: CustomAttributeUiFlags = {
    isFetching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
};
let loadedAccountId = 0;
let pendingAccountId = 0;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function setUiFlags(patch: Partial<CustomAttributeUiFlags>): void {
    uiFlags = { ...uiFlags, ...patch };
    notify();
}

function endpoint(accountId: number, id?: number): string {
    const base = `/api/v1/accounts/${accountId}/custom_attribute_definitions`;
    return id ? `${base}/${id}` : base;
}

export function fetchCustomAttributes(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    setUiFlags({ isFetching: true });

    getJson<CustomAttributeDefinition[]>(endpoint(accountId))
        .then(response => {
            records = Array.isArray(response) ? response : EMPTY_RECORDS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            setUiFlags({ isFetching: false });
        });
}

export async function createCustomAttribute(
    accountId: number,
    payload: CustomAttributePayload,
): Promise<CustomAttributeDefinition> {
    setUiFlags({ isCreating: true });
    try {
        const created = await postJson<CustomAttributeDefinition>(endpoint(accountId), payload);
        records = [...records, created];
        return created;
    } finally {
        setUiFlags({ isCreating: false });
    }
}

export async function updateCustomAttribute(
    accountId: number,
    id: number,
    payload: Partial<CustomAttributePayload>,
): Promise<CustomAttributeDefinition> {
    setUiFlags({ isUpdating: true });
    try {
        const updated = await patchJson<CustomAttributeDefinition>(endpoint(accountId, id), payload);
        records = records.map(record => (record.id === id ? updated : record));
        return updated;
    } finally {
        setUiFlags({ isUpdating: false });
    }
}

export async function deleteCustomAttribute(accountId: number, id: number): Promise<void> {
    setUiFlags({ isDeleting: true });
    try {
        await deleteJson(endpoint(accountId, id));
        records = records.filter(record => record.id !== id);
    } finally {
        setUiFlags({ isDeleting: false });
    }
}

export function toCamelAttribute(record: CustomAttributeDefinition): CamelCustomAttribute {
    return {
        id: record.id,
        attributeDisplayName: record.attribute_display_name,
        attributeDisplayType: record.attribute_display_type,
        attributeDescription: record.attribute_description ?? null,
        attributeKey: record.attribute_key,
        attributeValues: record.attribute_values ?? [],
        attributeModel: record.attribute_model,
        regexPattern: record.regex_pattern ?? null,
        regexCue: record.regex_cue ?? null,
    };
}

// getAttributes của gốc: toàn bộ bản ghi, dạng snake_case như API trả về.
export function useCustomAttributes(accountId: number): CustomAttributeDefinition[] {
    useEffect(() => fetchCustomAttributes(accountId), [accountId]);

    return useSyncExternalStore(subscribe, () => records);
}

// getAttributesByModel của gốc.
export function useCustomAttributesByModel(accountId: number, model: AttributeModel): CustomAttributeDefinition[] {
    const all = useCustomAttributes(accountId);

    return all.filter(record => record.attribute_model === model);
}

// getConversationAttributes / getContactAttributes của gốc (camelCase).
export function useCamelCustomAttributes(accountId: number, model: AttributeModel): CamelCustomAttribute[] {
    return useCustomAttributesByModel(accountId, model).map(toCamelAttribute);
}

export function useCustomAttributeUiFlags(): CustomAttributeUiFlags {
    return useSyncExternalStore(subscribe, () => uiFlags);
}

// Chỉ dùng trong test: trả store về trạng thái ban đầu.
export function resetCustomAttributesStore(): void {
    records = EMPTY_RECORDS;
    loadedAccountId = 0;
    pendingAccountId = 0;
    uiFlags = { isFetching: false, isCreating: false, isUpdating: false, isDeleting: false };
    notify();
}
