import { describe, expect, it } from 'vitest';

import { formatInLocale } from 'shared/helpers/timeHelper';
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

    it('hiện giờ bắt đầu theo múi giờ người xem, kể cả chuỗi UTC không ghi múi giờ', () => {
        const [utcStamp] = buildConversationInfoElements({ initiated_at: { timestamp: '2026-10-02 03:04:59' } });
        const [isoStamp] = buildConversationInfoElements({ initiated_at: { timestamp: '2026-10-02T03:04:59Z' } });
        const expected = formatInLocale(new Date(Date.UTC(2026, 9, 2, 3, 4, 59)), 'dd MMM yyyy, h:mm a');

        expect(utcStamp.content).toBe(expected);
        expect(isoStamp.content).toBe(expected);
    });

    it('giữ nguyên chuỗi giờ không đọc được', () => {
        const [element] = buildConversationInfoElements({ initiated_at: { timestamp: 'không rõ' } });

        expect(element.content).toBe('không rõ');
    });

    it('ip lấy từ thuộc tính của contact, không phải của hội thoại', () => {
        const elements = buildConversationInfoElements({}, { created_at_ip: '10.0.0.1' });
        expect(elements).toHaveLength(1);
        expect(elements[0].key).toBe('static-ip-address');
    });
});
