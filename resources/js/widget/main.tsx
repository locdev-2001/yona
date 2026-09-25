import { createRoot } from 'react-dom/client';

import { fetchConfig } from './api/widget';
import { restoreAuthToken, setAuthToken, setLocale, setWebsiteToken } from './api/client';
import { getConversationCookie, getLocale, getNewSessionResetId, getWebsiteToken } from './helpers/urlParams';
import { isLightBackground } from './helpers/colorHelper';
import { widgetConnector } from './realtime/WidgetConnector';
import { widgetStore } from './store/widgetStore';
import App from './App';
import type { ChannelConfig, WebsiteChannelConfigPayload } from './types';

// Điểm vào của app widget. Phiên khách dựng bằng POST /api/v1/widget/config rồi map
// sang bộ khóa camelCase của ChannelConfig.

function toChannelConfig(payload: WebsiteChannelConfigPayload): ChannelConfig {
    return {
        allowMessagesAfterResolved: payload.allow_messages_after_resolved,
        apiHost: payload.api_host,
        avatarUrl: payload.avatar_url,
        csatSurveyEnabled: payload.csat_survey_enabled,
        disableBranding: payload.disable_branding,
        enabledFeatures: payload.enabled_features ?? [],
        enabledLanguages: payload.enabled_languages ?? [],
        locale: payload.locale,
        outOfOfficeMessage: payload.out_of_office_message,
        portal: payload.portal,
        preChatFormEnabled: payload.pre_chat_form_enabled,
        preChatFormOptions: payload.pre_chat_form_options ?? {},
        replyTime: payload.reply_time,
        timezone: payload.timezone,
        utcOffset: payload.utc_off_set,
        websiteName: payload.website_name,
        websiteToken: payload.website_token,
        welcomeTagline: payload.welcome_tagline,
        welcomeTitle: payload.welcome_title,
        widgetColor: payload.widget_color,
        workingHours: (payload.working_hours ?? []).map(slot => ({
            dayOfWeek: slot.day_of_week,
            closedAllDay: slot.closed_all_day,
            openAllDay: slot.open_all_day,
            openHour: slot.open_hour,
            openMinutes: slot.open_minutes,
            closeHour: slot.close_hour,
            closeMinutes: slot.close_minutes,
        })),
        workingHoursEnabled: payload.working_hours_enabled,
    };
}

async function bootstrap() {
    const search = window.location.search;
    setWebsiteToken(getWebsiteToken(search));

    // Token phiên cũ gửi ngay ở /config để nhận lại đúng khách, không đẻ hồ sơ mới.
    restoreAuthToken({ tokenFromUrl: getConversationCookie(search), resetId: getNewSessionResetId(search) });

    const localeFromUrl = getLocale(search);
    if (localeFromUrl) setLocale(localeFromUrl);

    const container = document.getElementById('app');
    if (!container) return;
    createRoot(container).render(<App />);

    try {
        const { website_channel_config: channelPayload, contact, global_config: globalConfig } = await fetchConfig();

        setAuthToken(channelPayload.auth_token);
        if (!localeFromUrl && channelPayload.locale) setLocale(channelPayload.locale);

        const channelConfig = toChannelConfig(channelPayload);
        widgetStore.setChannelConfig(channelConfig, globalConfig ?? {}, contact);
        document.documentElement.style.setProperty('--widget-color', channelConfig.widgetColor);
        // Màu nhấn do tenant chọn: nền sáng thì chữ/icon trên nó dùng mực tối (token trong widget.scss).
        document.documentElement.dataset.accentTone = isLightBackground(channelConfig.widgetColor) ? 'light' : 'dark';

        await widgetStore.getConversationAttributes();
        widgetConnector.connect(contact.pubsub_token);
    } catch {
        // Token sai/inbox không tồn tại: giữ màn trống như bản gốc (server trả 404).
    }
}

void bootstrap();
