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
