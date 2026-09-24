// Port: refs/chatwoot/app/javascript/sdk/IFrameHelper.js
import { addClasses, loadCSS, removeClasses, onLocationChangeListener } from './DOMHelpers';
import {
    body,
    widgetHolder,
    createBubbleHolder,
    createBubbleIcon,
    bubbleSVG,
    chatBubble,
    closeBubble,
    bubbleHolder,
    onClickChatBubble,
    onBubbleClick,
    setBubbleText,
    addUnreadClass,
    removeUnreadClass,
} from './bubbleHelpers';
import { isWidgetColorLighter } from './helpers/colorHelper';
import { dispatchWindowEvent } from './helpers/customEvent';
import { CHATWOOT_ERROR, CHATWOOT_POSTBACK, CHATWOOT_READY } from './constants/sdkEvents';
import { SET_USER_ERROR } from './constants/errorTypes';
import { FRAME_MESSAGE_PREFIX } from './constants/frameEvents';
import { getUserCookieName, removeCookieWithDomain, setCookieWithDomain } from './cookieHelpers';
import { getCookie } from './helpers/cookies';
import { getAlertAudio, initOnEvents } from './helpers/audioNotification';
import { isFlatWidgetStyle } from './settingsHelper';
import { popoutChatWindow } from './helpers/popoutHelper';

const AUTH_COOKIE = 'cw_conversation';
const CAMPAIGN_SNOOZE_COOKIE = 'cw_snooze_campaigns_till';

const updateAuthCookie = (cookieContent: string, baseDomain = ''): void =>
    setCookieWithDomain(AUTH_COOKIE, cookieContent, { baseDomain });

const updateCampaignReadStatus = (baseDomain?: string): void => {
    const expireBy = new Date(Date.now() + 60 * 60 * 1000);
    setCookieWithDomain(CAMPAIGN_SNOOZE_COOKIE, Number(expireBy), { expires: expireBy, baseDomain });
};

type FrameMessage = { event: string } & Record<string, unknown>;
type FrameMessageHandler = (message: never) => void;

export const IFrameHelper = {
    getUrl({ baseUrl, websiteToken }: { baseUrl: string; websiteToken: string }): string {
        return `${baseUrl}/widget?website_token=${websiteToken}`;
    },
    createFrame: ({ baseUrl, websiteToken }: { baseUrl: string; websiteToken: string }): void => {
        if (IFrameHelper.getAppFrame()) {
            return;
        }

        loadCSS();
        const iframe = document.createElement('iframe');
        const cwCookie = getCookie(AUTH_COOKIE);
        let widgetUrl = IFrameHelper.getUrl({ baseUrl, websiteToken });
        if (cwCookie) {
            widgetUrl = `${widgetUrl}&cw_conversation=${cwCookie}`;
        }
        iframe.src = widgetUrl;
        iframe.allow =
            'camera;microphone;fullscreen;display-capture;picture-in-picture;clipboard-write;';
        iframe.id = 'chatwoot_live_chat_widget';
        iframe.style.visibility = 'hidden';

        let holderClassName = `woot-widget-holder woot--hide woot-elements--${window.$chatwoot.position}`;
        if (window.$chatwoot.hideMessageBubble) {
            holderClassName += ` woot-widget--without-bubble`;
        }
        if (isFlatWidgetStyle(window.$chatwoot.widgetStyle)) {
            holderClassName += ` woot-widget-holder--flat`;
        }

        addClasses(widgetHolder, holderClassName);
        widgetHolder.id = 'cw-widget-holder';
        widgetHolder.dataset.turboPermanent = 'true';
        widgetHolder.appendChild(iframe);
        body.appendChild(widgetHolder);
        IFrameHelper.initPostMessageCommunication();
        IFrameHelper.initWindowSizeListener();
        IFrameHelper.preventDefaultScroll();
    },
    getAppFrame: (): HTMLIFrameElement | null =>
        document.getElementById('chatwoot_live_chat_widget') as HTMLIFrameElement | null,
    getBubbleHolder: (): HTMLCollectionOf<Element> => document.getElementsByClassName('woot--bubble-holder'),
    sendMessage: (key: string, value: Record<string, unknown> = {}): void => {
        const element = IFrameHelper.getAppFrame();
        element?.contentWindow?.postMessage(
            `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: key, ...value })}`,
            '*',
        );
    },
    initPostMessageCommunication: (): void => {
        window.onmessage = e => {
            if (typeof e.data !== 'string' || e.data.indexOf(FRAME_MESSAGE_PREFIX) !== 0) {
                return;
            }
            const message = JSON.parse(e.data.replace(FRAME_MESSAGE_PREFIX, '')) as FrameMessage;
            const handler = (IFrameHelper.events as Record<string, FrameMessageHandler | undefined>)[message.event];
            if (typeof handler === 'function') {
                (handler as (payload: FrameMessage) => void)(message);
            }
        };
    },
    initWindowSizeListener: (): void => {
        window.addEventListener('resize', () => IFrameHelper.toggleCloseButton());
    },
    preventDefaultScroll: (): void => {
        widgetHolder.addEventListener('wheel', event => {
            const deltaY = event.deltaY;
            const contentHeight = widgetHolder.scrollHeight;
            const visibleHeight = widgetHolder.offsetHeight;
            const scrollTop = widgetHolder.scrollTop;

            if ((scrollTop === 0 && deltaY < 0) || (visibleHeight + scrollTop === contentHeight && deltaY > 0)) {
                event.preventDefault();
            }
        });
    },

    setFrameHeightToFitContent: (extraHeight: number, isFixedHeight?: boolean): void => {
        const iframe = IFrameHelper.getAppFrame();
        const updatedIframeHeight = isFixedHeight ? `${extraHeight}px` : '100%';

        if (iframe) iframe.setAttribute('style', `height: ${updatedIframeHeight} !important`);
    },

    setupAudioListeners: (): void => {
        const { baseUrl = '' } = window.$chatwoot;
        getAlertAudio(baseUrl, { type: 'widget', alertTone: 'ding' }).then(() =>
            initOnEvents.forEach(event => {
                document.removeEventListener(event, IFrameHelper.setupAudioListeners, false);
            }),
        );
    },

    events: {
        loaded: (message: { config: { authToken: string; channelConfig: { widgetColor: string } } }): void => {
            updateAuthCookie(message.config.authToken, window.$chatwoot.baseDomain);
            window.$chatwoot.hasLoaded = true;
            const campaignsSnoozedTill = getCookie(CAMPAIGN_SNOOZE_COOKIE);
            IFrameHelper.sendMessage('config-set', {
                locale: window.$chatwoot.locale,
                position: window.$chatwoot.position,
                hideMessageBubble: window.$chatwoot.hideMessageBubble,
                showPopoutButton: window.$chatwoot.showPopoutButton,
                widgetStyle: window.$chatwoot.widgetStyle,
                darkMode: window.$chatwoot.darkMode,
                showUnreadMessagesDialog: window.$chatwoot.showUnreadMessagesDialog,
                campaignsSnoozedTill,
                welcomeTitle: window.$chatwoot.welcomeTitle,
                welcomeDescription: window.$chatwoot.welcomeDescription,
                availableMessage: window.$chatwoot.availableMessage,
                unavailableMessage: window.$chatwoot.unavailableMessage,
                enableFileUpload: window.$chatwoot.enableFileUpload,
                enableEmojiPicker: window.$chatwoot.enableEmojiPicker,
                enableEndConversation: window.$chatwoot.enableEndConversation,
            });
            IFrameHelper.onLoad({ widgetColor: message.config.channelConfig.widgetColor });
            IFrameHelper.toggleCloseButton();

            if (window.$chatwoot.user) {
                IFrameHelper.sendMessage('set-user', window.$chatwoot.user);
            }

            window.playAudioAlert = () => {};

            initOnEvents.forEach(e => {
                document.addEventListener(e, IFrameHelper.setupAudioListeners, false);
            });

            if (!window.$chatwoot.resetTriggered) {
                dispatchWindowEvent({ eventName: CHATWOOT_READY });
            }
        },
        error: ({ errorType, data }: { errorType: string; data: unknown }): void => {
            dispatchWindowEvent({ eventName: CHATWOOT_ERROR, data });

            if (errorType === SET_USER_ERROR) {
                removeCookieWithDomain(getUserCookieName(), window.$chatwoot.baseDomain);
            }
        },
        onEvent({ eventIdentifier: eventName, data }: { eventIdentifier: string; data: unknown }): void {
            dispatchWindowEvent({ eventName, data });
        },
        setBubbleLabel(message: { label: string }): void {
            setBubbleText(window.$chatwoot.launcherTitle || message.label);
        },

        setAuthCookie({ data: { widgetAuthToken } }: { data: { widgetAuthToken: string } }): void {
            updateAuthCookie(widgetAuthToken, window.$chatwoot.baseDomain);
        },

        setCampaignReadOn(): void {
            updateCampaignReadStatus(window.$chatwoot.baseDomain);
        },

        postback(data: unknown): void {
            dispatchWindowEvent({ eventName: CHATWOOT_POSTBACK, data });
        },

        toggleBubble: (state?: unknown): void => {
            const bubbleState: { toggleValue?: boolean } = {};
            if (state === 'open') {
                bubbleState.toggleValue = true;
            } else if (state === 'close') {
                bubbleState.toggleValue = false;
            }

            onBubbleClick(bubbleState);
        },

        popoutChatWindow: ({
            baseUrl,
            websiteToken,
            locale,
        }: {
            baseUrl: string;
            websiteToken: string;
            locale?: string;
        }): void => {
            const cwCookie = getCookie(AUTH_COOKIE);
            window.$chatwoot.toggle('close');
            popoutChatWindow(baseUrl, websiteToken, locale, cwCookie);
        },

        closeWindow: (): void => {
            onBubbleClick({ toggleValue: false });
            removeUnreadClass();
        },

        onBubbleToggle: (isOpen: boolean): void => {
            IFrameHelper.sendMessage('toggle-open', { isOpen });
            if (isOpen) {
                IFrameHelper.pushEvent('webwidget.triggered');
            }
        },
        onLocationChange: ({ referrerURL, referrerHost }: { referrerURL: string; referrerHost: string }): void => {
            IFrameHelper.sendMessage('change-url', { referrerURL, referrerHost });
        },
        updateIframeHeight: (message: { extraHeight?: number; isFixedHeight?: boolean }): void => {
            const { extraHeight = 0, isFixedHeight } = message;

            IFrameHelper.setFrameHeightToFitContent(extraHeight, isFixedHeight);
        },

        setUnreadMode: (): void => {
            addUnreadClass();
            onBubbleClick({ toggleValue: true });
        },

        resetUnreadMode: (): void => removeUnreadClass(),
        handleNotificationDot: (event: { unreadMessageCount: number }): void => {
            if (window.$chatwoot.hideMessageBubble) {
                return;
            }

            const bubbleElement = document.querySelector('.woot-widget-bubble');
            if (!bubbleElement) return;

            if (event.unreadMessageCount > 0 && !bubbleElement.classList.contains('unread-notification')) {
                addClasses(bubbleElement, 'unread-notification');
            } else if (event.unreadMessageCount === 0) {
                removeClasses(bubbleElement, 'unread-notification');
            }
        },

        closeChat: (): void => {
            onBubbleClick({ toggleValue: false });
        },

        playAudio: (): void => {
            window.playAudioAlert?.();
        },
    },
    pushEvent: (eventName: string): void => {
        IFrameHelper.sendMessage('push-event', { eventName });
    },

    onLoad: ({ widgetColor }: { widgetColor: string }): void => {
        const iframe = IFrameHelper.getAppFrame();
        if (!iframe) return;

        iframe.style.visibility = '';
        iframe.setAttribute('id', `chatwoot_live_chat_widget`);

        if (IFrameHelper.getBubbleHolder().length) {
            return;
        }
        createBubbleHolder(window.$chatwoot.hideMessageBubble);
        onLocationChangeListener();

        let className = 'woot-widget-bubble';
        let closeBtnClassName = `woot-elements--${window.$chatwoot.position} woot-widget-bubble woot--close woot--hide`;

        if (isFlatWidgetStyle(window.$chatwoot.widgetStyle)) {
            className += ' woot-widget-bubble--flat';
            closeBtnClassName += ' woot-widget-bubble--flat';
        }

        if (isWidgetColorLighter(widgetColor)) {
            className += ' woot-widget-bubble-color--lighter';
            closeBtnClassName += ' woot-widget-bubble-color--lighter';
        }

        const chatIcon = createBubbleIcon({ className, path: bubbleSVG, target: chatBubble });

        addClasses(closeBubble, closeBtnClassName);

        chatIcon.style.background = widgetColor;
        closeBubble.style.background = widgetColor;

        bubbleHolder.appendChild(chatIcon);
        bubbleHolder.appendChild(closeBubble);
        onClickChatBubble();
    },
    toggleCloseButton: (): void => {
        let isMobile = false;
        if (window.matchMedia('(max-width: 668px)').matches) {
            isMobile = true;
        }
        IFrameHelper.sendMessage('toggle-close-button', { isMobile });
    },
};
