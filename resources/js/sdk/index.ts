// Điểm vào bundle IIFE độc lập — API công khai `window.yonaSDK.run({websiteToken, baseUrl})`.
// Tên toàn cục đời trước vẫn trỏ cùng object (shared/legacyContracts.ts) để mã nhúng cũ không gãy.
import { IFrameHelper } from './IFrameHelper';
import { getBubbleView, getDarkMode, getWidgetStyle } from './settingsHelper';
import { computeHashForUserData, getUserCookieName, hasUserKeys, setCookieWithDomain } from './cookieHelpers';
import { getCookie } from './helpers/cookies';
import { addClasses, removeClasses, restoreWidgetInDOM } from './DOMHelpers';
import { SDK_SET_BUBBLE_VISIBILITY } from './constants/frameEvents';
import { exposeLegacySdk, exposeLegacySdkInstance, readLegacySdkSettings } from '../shared/legacyContracts';
import type { RunOptions, SdkSettings, SdkUserAttributes } from './types';

const runSDK = ({ baseUrl, websiteToken }: RunOptions): void => {
    if (window.$yona) {
        return;
    }

    // Rails Turbo: khi morph thì DOM giữ nguyên, chỉ cần cứu widget ở lần thay body thật.
    document.addEventListener('turbo:before-render', (event: Event) => {
        const detail = (event as CustomEvent<{ renderMethod?: string; newBody: HTMLElement }>).detail;
        if (detail.renderMethod === 'morph') return;

        restoreWidgetInDOM(detail.newBody);
    });

    if (window.Turbolinks) {
        document.addEventListener('turbolinks:before-render', (event: Event) => {
            restoreWidgetInDOM((event as unknown as { data: { newBody: HTMLElement } }).data.newBody);
        });
    }

    document.addEventListener('astro:before-swap', (event: Event) =>
        restoreWidgetInDOM((event as unknown as { newDocument: Document }).newDocument.body),
    );

    // Trang đặt cả hai biến thì biến tên mới thắng.
    const settings: SdkSettings = { ...(readLegacySdkSettings() as SdkSettings), ...(window.yonaSettings ?? {}) };
    let locale = settings.locale;
    const baseDomain = settings.baseDomain;

    if (settings.useBrowserLanguage) {
        locale = window.navigator.language.replace('-', '_');
    }

    window.$yona = {
        baseUrl,
        baseDomain,
        hasLoaded: false,
        hideMessageBubble: settings.hideMessageBubble || false,
        isOpen: false,
        position: settings.position === 'left' ? 'left' : 'right',
        websiteToken,
        locale,
        useBrowserLanguage: settings.useBrowserLanguage || false,
        type: getBubbleView(settings.type),
        launcherTitle: settings.launcherTitle || '',
        showPopoutButton: settings.showPopoutButton || false,
        showUnreadMessagesDialog: settings.showUnreadMessagesDialog ?? true,
        widgetStyle: getWidgetStyle(settings.widgetStyle) || 'standard',
        resetTriggered: false,
        darkMode: getDarkMode(settings.darkMode),
        welcomeTitle: settings.welcomeTitle || '',
        welcomeDescription: settings.welcomeDescription || '',
        availableMessage: settings.availableMessage || '',
        unavailableMessage: settings.unavailableMessage || '',
        enableFileUpload: settings.enableFileUpload,
        enableEmojiPicker: settings.enableEmojiPicker ?? true,
        enableEndConversation: settings.enableEndConversation ?? true,

        toggle(state?: 'open' | 'close') {
            IFrameHelper.events.toggleBubble(state);
        },

        toggleBubbleVisibility(visibility: 'hide' | 'show') {
            const widgetElm = document.querySelector('.woot--bubble-holder');
            const widgetHolder = document.querySelector('.woot-widget-holder');
            if (visibility === 'hide') {
                addClasses(widgetHolder, 'woot-widget--without-bubble');
                addClasses(widgetElm, 'woot-hidden');
                window.$yona.hideMessageBubble = true;
            } else if (visibility === 'show') {
                removeClasses(widgetElm, 'woot-hidden');
                removeClasses(widgetHolder, 'woot-widget--without-bubble');
                window.$yona.hideMessageBubble = false;
            }
            IFrameHelper.sendMessage(SDK_SET_BUBBLE_VISIBILITY, {
                hideMessageBubble: window.$yona.hideMessageBubble,
            });
        },

        popoutChatWindow() {
            IFrameHelper.events.popoutChatWindow({
                baseUrl: window.$yona.baseUrl,
                websiteToken: window.$yona.websiteToken,
                locale: window.$yona.locale,
            });
        },

        setUser(identifier: string | number, user: SdkUserAttributes) {
            if (typeof identifier !== 'string' && typeof identifier !== 'number') {
                throw new Error('Identifier should be a string or a number');
            }

            if (!hasUserKeys(user)) {
                throw new Error('User object should have one of the keys [avatar_url, email, name]');
            }

            const userCookieName = getUserCookieName();
            const existingCookieValue = getCookie(userCookieName);
            const hashToBeStored = computeHashForUserData({ identifier, user });
            if (hashToBeStored === existingCookieValue) {
                return;
            }

            window.$yona.identifier = identifier;
            window.$yona.user = user;
            IFrameHelper.sendMessage('set-user', { identifier, user });

            setCookieWithDomain(userCookieName, hashToBeStored, { baseDomain });
        },

        setCustomAttributes(customAttributes = {}) {
            if (!customAttributes || !Object.keys(customAttributes).length) {
                throw new Error('Custom attributes should have atleast one key');
            } else {
                IFrameHelper.sendMessage('set-custom-attributes', { customAttributes });
            }
        },

        deleteCustomAttribute(customAttribute = '') {
            if (!customAttribute) {
                throw new Error('Custom attribute is required');
            } else {
                IFrameHelper.sendMessage('delete-custom-attribute', { customAttribute });
            }
        },

        setConversationCustomAttributes(customAttributes = {}) {
            if (!customAttributes || !Object.keys(customAttributes).length) {
                throw new Error('Custom attributes should have atleast one key');
            } else {
                IFrameHelper.sendMessage('set-conversation-custom-attributes', { customAttributes });
            }
        },

        deleteConversationCustomAttribute(customAttribute = '') {
            if (!customAttribute) {
                throw new Error('Custom attribute is required');
            } else {
                IFrameHelper.sendMessage('delete-conversation-custom-attribute', { customAttribute });
            }
        },

        setLabel(label = '') {
            IFrameHelper.sendMessage('set-label', { label });
        },

        removeLabel(label = '') {
            IFrameHelper.sendMessage('remove-label', { label });
        },

        setLocale(localeToBeUsed = 'en') {
            // Khung dựng lại sau này (bắt đầu phiên mới) cũng mang ngôn ngữ vừa chọn.
            window.$yona.locale = localeToBeUsed;
            IFrameHelper.sendMessage('set-locale', { locale: localeToBeUsed });
        },

        setColorScheme(darkMode = 'light') {
            IFrameHelper.sendMessage('set-color-scheme', { darkMode: getDarkMode(darkMode) });
        },

        reset() {
            if (window.$yona.isOpen) {
                IFrameHelper.events.toggleBubble();
            }

            IFrameHelper.startNewSession();
        },
    };

    exposeLegacySdkInstance(window.$yona);

    IFrameHelper.createFrame({ baseUrl, websiteToken });
};

// Gán ngay lúc nạp script: mã nhúng gọi `.run` trong onload của thẻ script.
window.yonaSDK = {
    run: runSDK,
};
exposeLegacySdk(window.yonaSDK);
