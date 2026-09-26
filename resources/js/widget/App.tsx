import { useEffect, useRef, useState } from 'react';

import Spinner from 'shared/components/Spinner';
import { emitter } from 'shared/helpers/emitter';

import { setLocale as setApiLocale } from './api/client';
import { CAMPAIGN_SNOOZE_DURATION, WIDGET_BUS_EVENTS } from './helpers/constants';
import { getExtraSpaceToScroll, IFrameHelper, loadedEventConfig } from './helpers/iframe';
import type { LauncherLabels } from './helpers/iframe';
import { getLocale } from './helpers/urlParams';
import { t } from './i18n';
import { useInboxAvailability } from './components/Availability';
import { useWidgetState } from './store/hooks';
import { selectUnreadMessageCount, widgetStore } from './store/widgetStore';
import { currentRoute, replaceRoute, useWidgetRoute, WIDGET_ROUTES } from './router';
import Campaigns from './views/Campaigns';
import Messages from './views/Messages';
import PreChatForm from './views/PreChatForm';
import UnreadMessages from './views/UnreadMessages';
import ViewWithHeader from './views/ViewWithHeader';
import { SCREENS } from './screens/registry';
import TabBar from './ui/TabBar';
import EmptyState from './ui/EmptyState';
import { useExpanded } from './ui/expanded';
import MessageListScreen from './screens/MessageListScreen';
import WidgetMessageHost from './messaging/WidgetMessageHost';
import { getAuthToken } from './api/client';
import { SDK_SET_BUBBLE_VISIBILITY } from '../sdk/constants/frameEvents';
import type { AppConfig } from './types';

// Port từ widget/App.vue — vỏ ứng dụng + toàn bộ giao thức postMessage với SDK.
// Nhánh React Native WebView chưa port.

const UNREAD_OR_CAMPAIGN_ROUTES: string[] = [WIDGET_ROUTES.UNREAD_MESSAGES, WIDGET_ROUTES.CAMPAIGNS];

export default function App() {
    const route = useWidgetRoute();
    const expanded = useExpanded();
    const channelConfig = useWidgetState(state => state.channelConfig);
    const appConfig = useWidgetState(state => state.appConfig);
    const isFetchingList = useWidgetState(state => state.uiFlags.isFetchingList);
    const conversationSize = useWidgetState(state => Object.keys(state.conversations).length);
    const unreadMessageCount = useWidgetState(selectUnreadMessageCount);

    // SDK báo khung đang hiện kiểu điện thoại (toàn màn) hay khung nổi trên máy tính; chưa
    // báo (mở /widget trực tiếp, cửa sổ riêng) thì chưa biết.
    const [isMobileFrame, setMobileFrame] = useState<boolean | null>(null);
    const isIFrame = IFrameHelper.isIFrame();
    const activeCampaign = useWidgetState(state => state.activeCampaign);
    const agents = useWidgetState(state => state.agents);
    const { isInWorkingHours } = useInboxAvailability(agents);
    // App.vue giữ campaignsSnoozedTill trong `data` (không render) — ref giữ đúng
    // vai đó và luôn đọc được giá trị mới nhất trong listener postMessage.
    const campaignsSnoozedTill = useRef<number | undefined>(undefined);
    const isInWorkingHoursRef = useRef(isInWorkingHours);
    isInWorkingHoursRef.current = isInWorkingHours;

    const setIframeHeight = (isFixedHeight: boolean) => {
        window.requestAnimationFrame(() => {
            IFrameHelper.sendMessage({
                event: 'updateIframeHeight',
                isFixedHeight,
                extraHeight: getExtraSpaceToScroll(),
            });
        });
    };

    const unsetUnreadView = () => {
        if (!isIFrame) return;
        IFrameHelper.sendMessage({ event: 'resetUnreadMode' });
        setIframeHeight(false);
    };

    const openChatWindow = () => {
        if (isIFrame) IFrameHelper.sendMessage({ event: 'toggleBubble', state: 'open' });
    };

    // App.vue#registerListeners — SDK ↔ iframe.
    useEffect(() => {
        if (!isIFrame) return undefined;

        const onMessage = (nativeEvent: MessageEvent) => {
            if (!IFrameHelper.isAValidEvent(nativeEvent)) return;
            const message = IFrameHelper.getMessage(nativeEvent);

            switch (message.event) {
                case 'config-set': {
                    if (message.locale) setApiLocale(String(message.locale));
                    IFrameHelper.sendMessage(launcherLabelsEvent(selectUnreadMessageCount(widgetStore.getState())));
                    widgetStore.setAppConfig(message as unknown as Partial<AppConfig>);
                    void widgetStore.fetchOldConversations().then(showMessagesWhenConversationExists);
                    void widgetStore.fetchAvailableAgents();
                    void widgetStore.fetchContact();
                    // App.vue#setCampaignReadData — SDK gửi mốc tạm ngưng đọc từ cookie.
                    if (message.campaignsSnoozedTill) {
                        campaignsSnoozedTill.current = Number(message.campaignsSnoozedTill);
                    }
                    break;
                }
                case 'widget-visible':
                    document.querySelector('.conversation--container')?.scrollTo({
                        top: document.querySelector('.conversation--container')?.scrollHeight ?? 0,
                    });
                    break;
                case 'change-url': {
                    const referrerURL = String(message.referrerURL ?? '');
                    widgetStore.initCampaigns(referrerURL, isInWorkingHoursRef.current);
                    (window as { referrerURL?: string }).referrerURL = referrerURL;
                    widgetStore.patchAppConfig({ referrerHost: String(message.referrerHost ?? '') });
                    break;
                }
                case 'toggle-close-button':
                    setMobileFrame(Boolean(message.isMobile));
                    break;
                case 'push-event':
                    if (
                        message.eventName === 'webwidget.triggered' &&
                        UNREAD_OR_CAMPAIGN_ROUTES.includes(currentRoute())
                    ) {
                        break;
                    }
                    void widgetStore.createEvent(String(message.eventName));
                    break;
                case 'set-label':
                    void widgetStore.createLabel(String(message.label));
                    break;
                case 'remove-label':
                    void widgetStore.destroyLabel(String(message.label));
                    break;
                case 'set-user':
                    // SDK gửi hai shape: `{identifier, user}` khi trang gọi setUser, và bản
                    // TRẢI PHẲNG (không identifier) khi phát lại lúc `loaded`. Bản gốc nuốt
                    // lỗi ở shape phẳng; ở đây bỏ qua thẳng để không gọi API với identifier rỗng.
                    if (message.identifier && message.user) {
                        void widgetStore.setContactUser({
                            identifier: message.identifier as string,
                            user: message.user as Record<string, unknown>,
                        });
                    }
                    break;
                case 'set-custom-attributes':
                    void widgetStore.setContactCustomAttributes(
                        (message.customAttributes ?? {}) as Record<string, unknown>,
                    );
                    break;
                case 'delete-custom-attribute':
                    void widgetStore.deleteContactCustomAttribute(String(message.customAttribute));
                    break;
                case 'set-conversation-custom-attributes':
                    void widgetStore.setConversationCustomAttributes(
                        (message.customAttributes ?? {}) as Record<string, unknown>,
                    );
                    break;
                case 'delete-conversation-custom-attribute':
                    void widgetStore.deleteConversationCustomAttribute(String(message.customAttribute));
                    break;
                case 'set-locale':
                    setApiLocale(String(message.locale));
                    IFrameHelper.sendMessage(launcherLabelsEvent(selectUnreadMessageCount(widgetStore.getState())));
                    break;
                case 'toggle-open': {
                    const isOpen = Boolean(message.isOpen);
                    widgetStore.patchAppConfig({ isWidgetOpen: isOpen });

                    const activeRoute = currentRoute();
                    if (isOpen && leaveUnreadViewRoute()) unsetUnreadView();
                    showMessagesWhenConversationExists();
                    if (!isOpen && UNREAD_OR_CAMPAIGN_ROUTES.includes(activeRoute)) {
                        void widgetStore.setUserLastSeen();
                        unsetUnreadView();
                        replaceRoute(WIDGET_ROUTES.HOME);
                    }
                    if (!isOpen) widgetStore.resetCampaign();
                    break;
                }
                case SDK_SET_BUBBLE_VISIBILITY:
                    widgetStore.patchAppConfig({ hideMessageBubble: Boolean(message.hideMessageBubble) });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cấu hình kênh + authToken chỉ có sau khi POST /config xong, nên phải đợi
    // (mọi endpoint khác trả 404 khi chưa có phiên khách).
    useEffect(() => {
        if (!channelConfig) return;

        if (isIFrame) {
            IFrameHelper.sendMessage(
                loadedEventConfig(getAuthToken(), channelConfig, launcherLabels(selectUnreadMessageCount(widgetStore.getState()))),
            );
            return;
        }

        const localeFromUrl = getLocale(window.location.search);
        if (localeFromUrl) setApiLocale(localeFromUrl);
        void widgetStore.fetchOldConversations();
        void widgetStore.fetchAvailableAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Boolean(channelConfig)]);

    // App.vue#registerUnreadEvents
    useEffect(() => {
        const onAgentMessage = () => {
            const isOnMessages = currentRoute() === WIDGET_ROUTES.MESSAGES;
            if ((widgetStore.getState().appConfig.isWidgetOpen || !isIFrame) && isOnMessages) {
                void widgetStore.setUserLastSeen();
            }
            setUnreadView();
        };
        const onUnreadClick = () => {
            openChatWindow();
            replaceRoute(WIDGET_ROUTES.MESSAGES);
            unsetUnreadView();
        };
        // Đóng khung xem trước không phải đọc tin: không ghi đã xem, badge ở lại.
        const onUnreadViewClose = () => {
            leaveUnreadViewRoute();
            unsetUnreadView();
            widgetStore.resetCampaign();
        };

        emitter.on(WIDGET_BUS_EVENTS.ON_AGENT_MESSAGE_RECEIVED, onAgentMessage);
        emitter.on(WIDGET_BUS_EVENTS.ON_UNREAD_MESSAGE_CLICK, onUnreadClick);
        emitter.on(WIDGET_BUS_EVENTS.ON_UNREAD_VIEW_CLOSE, onUnreadViewClose);
        return () => {
            emitter.off(WIDGET_BUS_EVENTS.ON_AGENT_MESSAGE_RECEIVED, onAgentMessage);
            emitter.off(WIDGET_BUS_EVENTS.ON_UNREAD_MESSAGE_CLICK, onUnreadClick);
            emitter.off(WIDGET_BUS_EVENTS.ON_UNREAD_VIEW_CLOSE, onUnreadViewClose);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // App.vue#registerCampaignEvents
    useEffect(() => {
        // Bấm chip dưới lời mời: như bấm bong bóng, rồi gửi chữ của chip làm tin đầu. Có biểu
        // mẫu trước chat thì khách điền biểu mẫu trước, chip bỏ qua (khách tự gõ lại).
        const onCampaignClick = (details: unknown) => {
            const { firstMessage } = (details ?? {}) as { firstMessage?: string };
            openChatWindow();
            const campaign = widgetStore.getState().activeCampaign;
            if (shouldShowPreChatForm()) {
                replaceRoute(WIDGET_ROUTES.PRECHAT_FORM);
            } else {
                replaceRoute(WIDGET_ROUTES.MESSAGES);
                if (campaign) emitter.emit(WIDGET_BUS_EVENTS.EXECUTE_CAMPAIGN, { campaignId: campaign.id, firstMessage });
            }
            unsetUnreadView();
        };
        const onExecuteCampaign = (details: unknown) => {
            const { campaignId, customAttributes, firstMessage } = (details ?? {}) as {
                campaignId?: number;
                customAttributes?: Record<string, unknown>;
                firstMessage?: string;
            };
            if (!campaignId) return;
            replaceRoute(WIDGET_ROUTES.MESSAGES);
            void widgetStore.executeCampaign(campaignId, customAttributes).then(() => {
                if (firstMessage) void widgetStore.sendMessage({ content: firstMessage });
            });
        };
        const onSnoozeCampaigns = () => {
            campaignsSnoozedTill.current = Date.now() + CAMPAIGN_SNOOZE_DURATION;
        };

        emitter.on(WIDGET_BUS_EVENTS.ON_CAMPAIGN_MESSAGE_CLICK, onCampaignClick);
        emitter.on(WIDGET_BUS_EVENTS.EXECUTE_CAMPAIGN, onExecuteCampaign);
        emitter.on(WIDGET_BUS_EVENTS.SNOOZE_CAMPAIGNS, onSnoozeCampaigns);
        return () => {
            emitter.off(WIDGET_BUS_EVENTS.ON_CAMPAIGN_MESSAGE_CLICK, onCampaignClick);
            emitter.off(WIDGET_BUS_EVENTS.EXECUTE_CAMPAIGN, onExecuteCampaign);
            emitter.off(WIDGET_BUS_EVENTS.SNOOZE_CAMPAIGNS, onSnoozeCampaigns);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // App.vue: `watch activeCampaign -> setCampaignView`.
    useEffect(() => {
        if (!isIFrame || !activeCampaign) return;

        const state = widgetStore.getState();
        const isSnoozed = Boolean(campaignsSnoozedTill.current && campaignsSnoozedTill.current > Date.now());
        if (Object.keys(state.conversations).length || isSnoozed) return;

        replaceRoute(WIDGET_ROUTES.CAMPAIGNS);
        setIframeHeight(true);
        IFrameHelper.sendMessage({ event: 'setUnreadMode' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCampaign, isIFrame]);

    // App.vue#handleUnreadNotificationDot
    useEffect(() => {
        if (!isIFrame) return;
        IFrameHelper.sendMessage({ event: 'handleNotificationDot', unreadMessageCount });
        IFrameHelper.sendMessage(launcherLabelsEvent(unreadMessageCount));
    }, [unreadMessageCount, appConfig.hideMessageBubble, isIFrame]);

    const setUnreadView = () => {
        const state = widgetStore.getState();
        if (!state.appConfig.showUnreadMessagesDialog || !isIFrame) return;

        if (currentRoute() === WIDGET_ROUTES.UNREAD_MESSAGES) {
            setIframeHeight(true);
            return;
        }

        const unreadCount = selectUnreadMessageCount(state);

        if (unreadCount > 0 && !state.appConfig.isWidgetOpen) {
            replaceRoute(WIDGET_ROUTES.UNREAD_MESSAGES);
            setIframeHeight(true);
            IFrameHelper.sendMessage({ event: 'setUnreadMode' });
        }
    };

    const isUnreadView = UNREAD_OR_CAMPAIGN_ROUTES.includes(route);

    if (!conversationSize && isFetchingList) {
        return (
            <div className="flex items-center justify-center flex-1 h-full bg-n-background">
                <Spinner size="" />
            </div>
        );
    }

    const screen = SCREENS[route];
    // Phóng to trên máy tính: tab Tin nhắn thành hai cột, danh sách luôn bên trái.
    const split = expanded && isMobileFrame === false && (route === WIDGET_ROUTES.MESSAGES || route === WIDGET_ROUTES.MESSAGE_LIST);
    const view = split ? (
        <div className="flex h-full min-h-0">
            <div className="flex w-[300px] flex-none flex-col border-e border-[var(--yona-chat-line)]">
                <MessageListScreen />
                <TabBar />
            </div>
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
                {route === WIDGET_ROUTES.MESSAGES ? (
                    <ViewWithHeader route={route}>
                        <Messages />
                    </ViewWithHeader>
                ) : (
                    <EmptyState icon="i-lucide-messages-square" title={t('MESSAGE_LIST.PICK')} />
                )}
            </div>
        </div>
    ) : screen ? (
        <div className="flex h-full min-h-0 flex-col">
            <screen.Component />
            {screen.tabBar ? <TabBar /> : null}
        </div>
    ) : (
        <ViewWithHeader route={route}>{route === WIDGET_ROUTES.PRECHAT_FORM ? <PreChatForm /> : <Messages />}</ViewWithHeader>
    );

    return (
        <div
            className={[
                'flex flex-col justify-end h-full',
                isMobileFrame ? 'is-mobile' : '',
                isMobileFrame === false ? 'is-desktop-frame' : '',
                appConfig.position === 'right' ? 'is-widget-right' : '',
                appConfig.hideMessageBubble ? 'is-bubble-hidden' : '',
                appConfig.widgetStyle === 'flat' ? 'is-flat-design' : '',
                isUnreadView ? '' : 'bg-n-slate-2',
                channelConfig ? '' : 'invisible',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <WidgetMessageHost>
                {route === WIDGET_ROUTES.CAMPAIGNS ? (
                    <Campaigns />
                ) : isUnreadView ? (
                    <UnreadMessages />
                ) : (
                    view
                )}
            </WidgetMessageHost>
        </div>
    );
}

const conversationSizeNow = () => Object.keys(widgetStore.getState().conversations).length;

// Khung xem trước tin mới/campaign chỉ sống khi khung chat đóng: mở khung chat thật
// hay đóng khung xem trước đều đưa widget về màn hình chủ.
export const leaveUnreadViewRoute = (): boolean => {
    if (!UNREAD_OR_CAMPAIGN_ROUTES.includes(currentRoute())) return false;
    replaceRoute(WIDGET_ROUTES.HOME);
    return true;
};

// App.vue#toggle-open (shouldShowMessageView): mở widget khi đang ở màn hình chủ
// mà đã có hội thoại thì vào thẳng khung chat.
// Widget phải POST /config trước khi nạp danh sách tin, nên tin có thể
// về SAU sự kiện `toggle-open` — khi đó luật trên đọc phải danh sách rỗng và
// widget kẹt ở màn hình chủ. Vì vậy luật nằm ở đúng một chỗ và được chạy lại khi
// danh sách tin nạp xong.
export const showMessagesWhenConversationExists = (): void => {
    if (!widgetStore.getState().appConfig.isWidgetOpen) return;
    if (currentRoute() !== WIDGET_ROUTES.HOME) return;
    if (!conversationSizeNow()) return;
    // Chỉ vào thẳng khung chat khi hội thoại còn dở; đã xong thì ở Home (founder chốt 25/09).
    if (widgetStore.getState().conversationAttributes.status === 'resolved') return;
    replaceRoute(WIDGET_ROUTES.MESSAGES);
};

// configMixin#shouldShowPreChatForm — form chỉ hiện khi bật cờ VÀ có ít nhất một
// trường đang bật.
const shouldShowPreChatForm = (): boolean => {
    const channelConfig = widgetStore.getState().channelConfig;
    const enabledFields = (channelConfig?.preChatFormOptions?.pre_chat_fields ?? []).filter(
        field => field.enabled,
    );

    return Boolean(channelConfig?.preChatFormEnabled) && enabledFields.length > 0;
};

// Câu chữ của launcher (SDK vẽ trên trang khách) theo ngôn ngữ widget. `label` là chữ của bong bóng
// mở rộng — SDK ưu tiên launcherTitle của trang khách rồi mới tới nhãn này.
const launcherLabels = (unreadCount: number): LauncherLabels => ({
    label: t('BUBBLE.LABEL'),
    openLabel: unreadCount > 0 ? t('LAUNCHER.OPEN_UNREAD', { count: unreadCount }) : t('LAUNCHER.OPEN'),
    closeLabel: t('LAUNCHER.CLOSE'),
});

const launcherLabelsEvent = (unreadCount: number) => ({ event: 'setBubbleLabel', ...launcherLabels(unreadCount) });
