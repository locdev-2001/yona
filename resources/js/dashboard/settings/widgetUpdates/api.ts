import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';
import type { WidgetUpdate, WidgetUpdateFormValues } from './types';

// Cửa gọi duy nhất tới WebApi\WidgetUpdatesController — Index/AddWidgetUpdate/
// EditWidgetUpdate chỉ gọi qua đây, không tự ráp URL.
const baseUrl = (accountId: number) => `/api/v1/accounts/${accountId}/widget_updates`;

// payload phẳng gửi lên BE: cover_url rỗng/inboxId rỗng gửi null để BE gỡ giá trị cũ.
function toPayload(values: WidgetUpdateFormValues): Record<string, unknown> {
    return {
        title: values.title.trim(),
        body: values.body.trim() || null,
        tag: values.tag,
        cover_url: values.coverUrl.trim() || null,
        cta_label: values.ctaLabel.trim() || null,
        cta_url: values.ctaUrl.trim() || null,
        inbox_id: values.inboxId,
    };
}

export function fetchWidgetUpdates(accountId: number, page = 1): Promise<{ payload: WidgetUpdate[]; meta: { has_more: boolean } }> {
    return getJson(`${baseUrl(accountId)}?page=${page}`);
}

export function createWidgetUpdate(accountId: number, values: WidgetUpdateFormValues): Promise<WidgetUpdate> {
    return postJson(baseUrl(accountId), toPayload(values));
}

export function updateWidgetUpdate(accountId: number, id: number, values: WidgetUpdateFormValues): Promise<WidgetUpdate> {
    return patchJson(`${baseUrl(accountId)}/${id}`, toPayload(values));
}

export function deleteWidgetUpdate(accountId: number, id: number): Promise<void> {
    return deleteJson(`${baseUrl(accountId)}/${id}`);
}

export function publishWidgetUpdate(accountId: number, id: number): Promise<WidgetUpdate> {
    return postJson(`${baseUrl(accountId)}/${id}/publish`, {});
}

export function unpublishWidgetUpdate(accountId: number, id: number): Promise<WidgetUpdate> {
    return postJson(`${baseUrl(accountId)}/${id}/unpublish`, {});
}
