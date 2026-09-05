import { describe, expect, it } from 'vitest';

import { buildConversationInfoElements } from './conversationInfoAttributes';

describe('buildConversationInfoElements', () => {
    it('bỏ hết khi hội thoại không mang thuộc tính trình duyệt (kênh API)', () => {
        expect(buildConversationInfoElements({}, {})).toEqual([]);
    });

    it('giữ đúng thứ tự và khóa dịch của ConversationInfo.vue', () => {
        const elements = buildConversationInfoElements(
            {
                initiated_at: { timestamp: '2026-09-01T10:00:00Z' },
                browser_language: 'vi',
                referer: 'https://yona.vn/gia',
                browser: {
                    browser_name: 'Chrome',
                    browser_version: '131',
                    platform_name: 'Linux',
                    platform_version: '6',
                },
            },
            { created_at_ip: '113.161.0.1' },
        );

        expect(elements.map(element => element.key)).toEqual([
            'static-initiated-at',
            'static-browser-language',
            'static-referer',
            'static-browser',
            'static-platform',
            'static-ip-address',
        ]);
        expect(elements[1].content).toBe('Vietnamese');
        expect(elements[3].content).toBe('Chrome 131');
        expect(elements[0].title).toBe('CONTACT_PANEL.INITIATED_AT');
    });

    it('ip lấy từ thuộc tính của contact, không phải của hội thoại', () => {
        const elements = buildConversationInfoElements({}, { created_at_ip: '10.0.0.1' });
        expect(elements).toHaveLength(1);
        expect(elements[0].key).toBe('static-ip-address');
    });
});
