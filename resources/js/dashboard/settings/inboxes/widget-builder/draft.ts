import { ApiError } from 'dashboard/helper/apiClient';
import type { Inbox, WidgetSettingsShape } from '../types';
import type { WidgetBuilderFieldErrors, WidgetBuilderSectionId, WidgetDraft } from './types';

export const DEFAULT_WIDGET_SETTINGS: WidgetSettingsShape = {
    appearance: { launcher: 'round', launcher_label: null, position: 'right', greeting: null },
    home: {
        blocks: {
            recent_conversation: true,
            help: true,
            other_channels: true,
            custom_links: true,
            request: false,
        },
    },
    other_channels: [],
    custom_links: [],
    capture: { phone: true, email: true },
    expanded_enabled: true,
};

export function draftFromInbox(inbox: Inbox): WidgetDraft {
    return {
        name: inbox.name,
        widgetColor: inbox.widget_color || '#1f93ff',
        welcomeTagline: inbox.welcome_tagline ?? '',
        widgetSettings: inbox.widget_settings ?? DEFAULT_WIDGET_SETTINGS,
    };
}

export function draftsEqual(a: WidgetDraft, b: WidgetDraft): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Payload PATCH duy nhất mà nút "Lưu thay đổi" gửi, bất kể đang sửa thẻ nào. */
export function buildSavePayload(draft: WidgetDraft): Record<string, unknown> {
    return {
        name: draft.name,
        channel: {
            widget_color: draft.widgetColor,
            welcome_tagline: draft.welcomeTagline,
            widget_settings: draft.widgetSettings,
        },
    };
}

/** `error.body.errors` (Record<string, string[]>) → khoá phẳng lấy thông điệp đầu tiên. */
export function flattenFieldErrors(errors: Record<string, string[]>): WidgetBuilderFieldErrors {
    return Object.fromEntries(Object.entries(errors).map(([key, messages]) => [key, messages[0] ?? '']));
}

/** Lỗi 422 rơi vào khoá nào thì cuộn tới đúng thẻ đó. */
export function sectionForFieldError(fieldKey: string): WidgetBuilderSectionId {
    if (fieldKey.startsWith('other_channels') || fieldKey.startsWith('custom_links')) return 'channels';

    return 'appearance';
}

export function fieldErrorsOf(error: unknown): Record<string, string[]> | null {
    return error instanceof ApiError && error.body?.errors ? error.body.errors : null;
}
