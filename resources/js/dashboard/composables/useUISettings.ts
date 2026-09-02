import { putJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/composables/useUISettings.js (phần trang profile cần).
export type UISettings = Record<string, unknown>;

export function isEditorHotKeyEnabled(uiSettings: UISettings, key: 'enter' | 'cmd_enter'): boolean {
    const editorMessageKey = uiSettings.editor_message_key as string | undefined;
    const enterToSendEnabled = uiSettings.enter_to_send_enabled as boolean | undefined;

    if (!editorMessageKey) {
        return key === (enterToSendEnabled ? 'enter' : 'cmd_enter');
    }
    return editorMessageKey === key;
}

// updateUISettings của store gốc: merge rồi PUT /api/v1/profile (một điểm cho
// sidebar_width, signature flag, conversation_display_type, contacts_sort_by…).
export function updateUISettings(current: UISettings, patch: UISettings): UISettings {
    const next = { ...current, ...patch };
    void putJson('/api/v1/profile', { ui_settings: next });
    return next;
}
