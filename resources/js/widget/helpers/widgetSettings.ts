import type { WidgetSettingsConfig } from '../types';

// Mặc định khi server đời cũ chưa gửi `widget_settings` — khớp
// App\Support\Widget\WidgetSettings::DEFAULTS.
export const DEFAULT_WIDGET_SETTINGS: WidgetSettingsConfig = {
    appearance: { launcher: 'round', launcher_label: null, greeting: null },
    home: { blocks: { recent_conversation: true, help: true, other_channels: true, custom_links: true, request: false } },
    other_channels: [],
    custom_links: [],
    capture: { phone: true, email: true },
    expanded_enabled: true,
};
