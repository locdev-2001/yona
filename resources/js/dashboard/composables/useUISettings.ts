import { putJson } from 'dashboard/helper/apiClient';

// Port từ dashboard/composables/useUISettings.js (phần trang profile cần).
export type UISettings = Record<string, unknown>;

// slugifyChannel của useUISettings.js gốc — 'Channel::Email' → 'channel_email'.
export function slugifyChannel(name: string): string {
    return name?.toLowerCase().replace(' ', '_').replace('-', '_').replace('::', '_');
}

export function signatureFlagKey(channelType: string): string {
    return `${slugifyChannel(channelType)}_signature_enabled`;
}

export function quotedReplyFlagKey(channelType: string): string {
    return `${slugifyChannel(channelType)}_quoted_reply_enabled`;
}

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

// DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER + useConversationSidebarItemsOrder gốc:
// thứ tự accordion của ContactPanel, mục mới thêm sau thứ tự người dùng đã lưu.
export const DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER: readonly { name: string }[] = Object.freeze([
    { name: 'conversation_actions' },
    { name: 'macros' },
    { name: 'conversation_info' },
    { name: 'contact_attributes' },
    { name: 'contact_notes' },
    { name: 'shared_files' },
    { name: 'previous_conversation' },
    { name: 'conversation_participants' },
    { name: 'linear_issues' },
    { name: 'shopify_orders' },
]);

export function conversationSidebarItemsOrder(uiSettings: UISettings): { name: string }[] {
    const itemsOrder = uiSettings.conversation_sidebar_items_order as { name: string }[] | undefined;
    if (!itemsOrder) return [...DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER];

    const itemsOrderCopy = [...itemsOrder];
    DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER.forEach(item => {
        if (!itemsOrderCopy.some(saved => saved.name === item.name)) itemsOrderCopy.push(item);
    });
    return itemsOrderCopy;
}
