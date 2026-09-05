import { describe, expect, it } from 'vitest';

import { buildWidgetScript, replyTimeText } from './widgetScript';

const WEB_WIDGET_SCRIPT = `
    <script>
      (function(d,t) {
        var BASE_URL="http://localhost:3000";
      })(document,"script");
    </script>
    `;

describe('buildWidgetScript', () => {
    it('chèn window.chatwootSettings ngay sau thẻ <script>', () => {
        const script = buildWidgetScript(WEB_WIDGET_SCRIPT, {
            position: 'left',
            type: 'expanded_bubble',
            launcherTitle: 'Chat with us',
        });

        expect(script).toContain(
            '<script>\n      window.chatwootSettings = {"position":"left","type":"expanded_bubble","launcherTitle":"Chat with us"};',
        );
        expect(script.endsWith(WEB_WIDGET_SCRIPT.substring(13))).toBe(true);
    });

    it('giữ nguyên phần còn lại của đoạn nhúng', () => {
        const script = buildWidgetScript(WEB_WIDGET_SCRIPT, {
            position: 'right',
            type: 'standard',
            launcherTitle: '',
        });

        expect(script).toContain('var BASE_URL="http://localhost:3000";');
        expect(script).toContain('})(document,"script");');
    });

    it('trả chuỗi rỗng khi inbox chưa có đoạn nhúng', () => {
        expect(buildWidgetScript('', { position: 'right', type: 'standard', launcherTitle: '' })).toBe('');
    });
});

describe('replyTimeText', () => {
    it('ánh xạ đúng ba mức reply_time', () => {
        expect(replyTimeText('in_a_few_minutes')).toBe('Typically replies in a few minutes');
        expect(replyTimeText('in_a_few_hours')).toBe('Typically replies in a few hours');
        expect(replyTimeText('in_a_day')).toBe('Typically replies in a day');
    });

    it('rơi về "in a few hours" khi giá trị trống hoặc lạ', () => {
        expect(replyTimeText('')).toBe('Typically replies in a few hours');
        expect(replyTimeText('tomorrow')).toBe('Typically replies in a few hours');
    });
});
