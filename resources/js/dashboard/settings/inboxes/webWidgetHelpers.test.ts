import { beforeEach, describe, expect, it } from 'vitest';

import {
    ALLOW_MOBILE_WEBVIEW_FLAG,
    DEFAULT_WIDGET_BUBBLE_SETTINGS,
    buildWebsiteChannelPayload,
    readWidgetBubbleSettings,
    toggleFeatureFlag,
    writeWidgetBubbleSettings,
} from './webWidgetHelpers';

describe('buildWebsiteChannelPayload', () => {
    const form = {
        inboxName: '  Acme site  ',
        channelWebsiteUrl: 'https://acme.inc',
        channelWidgetColor: '#009CE0',
        channelWelcomeTitle: 'Hi there!',
        channelWelcomeTagline: 'Ask us anything',
        greetingEnabled: true,
        greetingMessage: 'Hello!',
    };

    it('dựng đúng payload createWebsiteChannel của Website.vue', () => {
        expect(buildWebsiteChannelPayload(form)).toEqual({
            name: 'Acme site',
            greeting_enabled: true,
            greeting_message: 'Hello!',
            channel: {
                type: 'web_widget',
                website_url: 'https://acme.inc',
                widget_color: '#009CE0',
                welcome_title: 'Hi there!',
                welcome_tagline: 'Ask us anything',
            },
        });
    });

    it('cắt khoảng trắng quanh tên inbox nhưng giữ nguyên các trường khác', () => {
        const payload = buildWebsiteChannelPayload({ ...form, inboxName: '\tShop\n' });

        expect(payload.name).toBe('Shop');
    });
});

describe('toggleFeatureFlag', () => {
    it('thêm cờ chưa có', () => {
        expect(toggleFeatureFlag(['attachments'], 'emoji_picker')).toEqual(['attachments', 'emoji_picker']);
    });

    it('bỏ cờ đã có mà không đụng cờ khác', () => {
        expect(toggleFeatureFlag(['attachments', 'emoji_picker'], 'attachments')).toEqual(['emoji_picker']);
    });

    it('không sửa mảng gốc', () => {
        const selected = ['attachments'];
        toggleFeatureFlag(selected, 'end_conversation');

        expect(selected).toEqual(['attachments']);
    });

    it('dùng chung được cho cờ webview di động của tab Configuration', () => {
        expect(toggleFeatureFlag([], ALLOW_MOBILE_WEBVIEW_FLAG)).toEqual([ALLOW_MOBILE_WEBVIEW_FLAG]);
    });
});

describe('tuỳ chọn bong bóng widget trong localStorage', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('trả mặc định khi chưa lưu gì', () => {
        expect(readWidgetBubbleSettings(7)).toEqual(DEFAULT_WIDGET_BUBBLE_SETTINGS);
    });

    it('lưu vào khóa widgetBubble_{inboxId} như LOCAL_STORAGE_KEYS gốc', () => {
        writeWidgetBubbleSettings(7, { position: 'left', type: 'expanded_bubble', launcherTitle: 'Chat' });

        expect(window.localStorage.getItem('widgetBubble_7')).toBe(
            '{"position":"left","type":"expanded_bubble","launcherTitle":"Chat"}',
        );
        expect(readWidgetBubbleSettings(7)).toEqual({
            position: 'left',
            type: 'expanded_bubble',
            launcherTitle: 'Chat',
        });
    });

    it('mỗi inbox một khóa riêng', () => {
        writeWidgetBubbleSettings(7, { position: 'left', type: 'standard', launcherTitle: '' });

        expect(readWidgetBubbleSettings(8)).toEqual(DEFAULT_WIDGET_BUBBLE_SETTINGS);
    });

    it('rơi về mặc định khi giá trị lưu hỏng hoặc thiếu trường', () => {
        window.localStorage.setItem('widgetBubble_7', 'không-phải-json');
        expect(readWidgetBubbleSettings(7)).toEqual(DEFAULT_WIDGET_BUBBLE_SETTINGS);

        window.localStorage.setItem('widgetBubble_7', '{"position":"left"}');
        expect(readWidgetBubbleSettings(7)).toEqual({
            position: 'left',
            type: 'standard',
            launcherTitle: '',
        });
    });
});
