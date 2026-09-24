// Port: refs/chatwoot/app/javascript/entrypoints/sdk.js
// Điểm vào bundle IIFE độc lập — API công khai `window.chatwootSDK.run({websiteToken, baseUrl})`.
import { IFrameHelper } from './IFrameHelper';
import { getBubbleView, getDarkMode, getWidgetStyle } from './settingsHelper';
import {
    computeHashForUserData,
    getUserCookieName,
    hasUserKeys,
    removeCookieWithDomain,
    setCookieWithDomain,
} from './cookieHelpers';
import { getCookie } from './helpers/cookies';
import { addClasses, removeClasses, restoreWidgetInDOM } from './DOMHelpers';
import { SDK_SET_BUBBLE_VISIBILITY } from './constants/frameEvents';
import type { ChatwootSettings, RunOptions, SdkUserAttributes } from './types';

const runSDK = ({ baseUrl, websiteToken }: RunOptions): void => {
    if (window.$chatwoot) {
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

    const chatwootSettings: ChatwootSettings = window.chatwootSettings || {};
    let locale = chatwootSettings.locale;
    const baseDomain = chatwootSettings.baseDomain;

    if (chatwootSettings.useBrowserLanguage) {
        locale = window.navigator.language.replace('-', '_');
    }

    window.$chatwoot = {
        baseUrl,
        baseDomain,
        hasLoaded: false,
        hideMessageBubble: chatwootSettings.hideMessageBubble || false,
        isOpen: false,
        position: chatwootSettings.position === 'left' ? 'left' : 'right',
        websiteToken,
        locale,
        useBrowserLanguage: chatwootSettings.useBrowserLanguage || false,
        type: getBubbleView(chatwootSettings.type),
        launcherTitle: chatwootSettings.launcherTitle || '',
        showPopoutButton: chatwootSettings.showPopoutButton || false,
        showUnreadMessagesDialog: chatwootSettings.showUnreadMessagesDialog ?? true,
        widgetStyle: getWidgetStyle(chatwootSettings.widgetStyle) || 'standard',
        resetTriggered: false,
        darkMode: getDarkMode(chatwootSettings.darkMode),
        welcomeTitle: chatwootSettings.welcomeTitle || '',
        welcomeDescription: chatwootSettings.welcomeDescription || '',
        availableMessage: chatwootSettings.availableMessage || '',
        unavailableMessage: chatwootSettings.unavailableMessage || '',
        enableFileUpload: chatwootSettings.enableFileUpload,
        enableEmojiPicker: chatwootSettings.enableEmojiPicker ?? true,
        enableEndConversation: chatwootSettings.enableEndConversation ?? true,

        toggle(state?: 'open' | 'close') {
            IFrameHelper.events.toggleBubble(state);
        },

        toggleBubbleVisibility(visibility: 'hide' | 'show') {
            const widgetElm = document.querySelector('.woot--bubble-holder');
            const widgetHolder = document.querySelector('.woot-widget-holder');
            if (visibility === 'hide') {
                addClasses(widgetHolder, 'woot-widget--without-bubble');
                addClasses(widgetElm, 'woot-hidden');
                window.$chatwoot.hideMessageBubble = true;
            } else if (visibility === 'show') {
                removeClasses(widgetElm, 'woot-hidden');
                removeClasses(widgetHolder, 'woot-widget--without-bubble');
                window.$chatwoot.hideMessageBubble = false;
            }
            IFrameHelper.sendMessage(SDK_SET_BUBBLE_VISIBILITY, {
                hideMessageBubble: window.$chatwoot.hideMessageBubble,
            });
        },

        popoutChatWindow() {
            IFrameHelper.events.popoutChatWindow({
                baseUrl: window.$chatwoot.baseUrl,
                websiteToken: window.$chatwoot.websiteToken,
                locale,
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

            window.$chatwoot.identifier = identifier;
            window.$chatwoot.user = user;
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
            IFrameHelper.sendMessage('set-locale', { locale: localeToBeUsed });
        },

        setColorScheme(darkMode = 'light') {
            IFrameHelper.sendMessage('set-color-scheme', { darkMode: getDarkMode(darkMode) });
        },

        reset() {
            if (window.$chatwoot.isOpen) {
                IFrameHelper.events.toggleBubble();
            }

            removeCookieWithDomain('cw_conversation', baseDomain);
            removeCookieWithDomain(getUserCookieName(), baseDomain);

            const iframe = IFrameHelper.getAppFrame();
            if (iframe) {
                iframe.src = IFrameHelper.getUrl({
                    baseUrl: window.$chatwoot.baseUrl,
                    websiteToken: window.$chatwoot.websiteToken,
                });
            }

            window.$chatwoot.resetTriggered = true;
        },
    };

    IFrameHelper.createFrame({ baseUrl, websiteToken });
};

window.chatwootSDK = {
    run: runSDK,
};
