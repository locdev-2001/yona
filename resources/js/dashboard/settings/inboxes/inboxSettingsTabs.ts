import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import type { ChannelCapability, InboxWithCapabilities } from 'shared/constants/channelCapabilities';

// Kênh tự khai phần cấu hình của hộp thư bằng năng lực `settings_*`: trang cài đặt
// chỉ dựng tab/khối theo khai báo, không rẽ nhánh theo `channel_type`.

/** Khối của tab Cấu hình, đúng thứ tự hiện. Kênh không khai khối nào thì không có tab. */
export const CONFIGURATION_SECTIONS = [
    'settings_mail_server',
    'settings_web_widget',
    'settings_client_api',
] as const satisfies readonly ChannelCapability[];

export type ConfigurationSection = (typeof CONFIGURATION_SECTIONS)[number];

export function declaredConfigurationSections(inbox: InboxWithCapabilities | null | undefined): ConfigurationSection[] {
    return CONFIGURATION_SECTIONS.filter(section => inboxSupports(inbox, section));
}

export const DEFAULT_INBOX_SETTINGS_TAB = 'inbox-settings';

export function inboxSettingsTabKeys(inbox: InboxWithCapabilities | null | undefined): string[] {
    return [
        DEFAULT_INBOX_SETTINGS_TAB,
        'collaborators',
        'business-hours',
        ...(isProductFeatureVisible('csat') ? ['csat'] : []),
        ...(inboxSupports(inbox, 'settings_pre_chat_form') ? ['pre-chat-form'] : []),
        ...(declaredConfigurationSections(inbox).length > 0 ? ['configuration'] : []),
        ...(isProductFeatureVisible('agentBots') ? ['bot-configuration'] : []),
    ];
}
