import { isLightAccent } from 'shared/helpers/accentContrast';

import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetSettingsConfig } from '../types';

export const PREVIEW_MESSAGE_PREFIX = 'yona-preview:';

/** Phần cấu hình màn cấu hình widget gửi sang khung xem trước mỗi lần sửa ô. */
export interface PreviewConfig {
    widgetColor?: string;
    websiteName?: string;
    welcomeTitle?: string;
    welcomeTagline?: string;
    widgetSettings?: WidgetSettingsConfig;
}

export function applyAccent(color: string): void {
    document.documentElement.style.setProperty('--widget-color', color);
    document.documentElement.dataset.accentTone = isLightAccent(color) ? 'light' : 'dark';
}

export function applyPreviewConfig(config: PreviewConfig): void {
    const state = widgetStore.getState();
    if (!state.channelConfig) return;

    const channelConfig: ChannelConfig = {
        ...state.channelConfig,
        ...(config.widgetColor ? { widgetColor: config.widgetColor } : {}),
        ...(config.websiteName !== undefined ? { websiteName: config.websiteName } : {}),
        ...(config.welcomeTitle !== undefined ? { welcomeTitle: config.welcomeTitle } : {}),
        ...(config.welcomeTagline !== undefined ? { welcomeTagline: config.welcomeTagline } : {}),
        ...(config.widgetSettings ? { widgetSettings: config.widgetSettings } : {}),
    };
    widgetStore.setChannelConfig(channelConfig, state.globalConfig ?? {}, state.contact!);
    applyAccent(channelConfig.widgetColor);
}

/**
 * Nghe cấu hình từ màn cấu hình của dashboard. Chỉ nhận từ chính origin Yona (dashboard và
 * widget cùng domain); trang lạ nhúng `preview=1` không đổi được gì. Báo `ready` để dashboard
 * gửi bản cấu hình đang sửa ngay khi khung nạp xong.
 */
export function listenForPreviewConfig(): () => void {
    const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as { type?: unknown; config?: PreviewConfig } | null;
        if (data?.type === `${PREVIEW_MESSAGE_PREFIX}config` && data.config) applyPreviewConfig(data.config);
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: `${PREVIEW_MESSAGE_PREFIX}ready` }, window.location.origin);

    return () => window.removeEventListener('message', onMessage);
}
