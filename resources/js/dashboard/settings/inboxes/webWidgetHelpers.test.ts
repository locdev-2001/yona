import { describe, expect, it } from 'vitest';

import { ALLOW_MOBILE_WEBVIEW_FLAG, buildWebsiteChannelPayload, toggleFeatureFlag } from './webWidgetHelpers';

describe('buildWebsiteChannelPayload', () => {
    const form = {
        inboxName: '  Acme site  ',
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
