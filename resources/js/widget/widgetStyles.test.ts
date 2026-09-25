import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom không tính CSS, nên luật tầng stylesheet được khoá bằng cách đọc thẳng nguồn SCSS.
const widgetScss = readFileSync(resolve(__dirname, '../../scss/widget.scss'), 'utf8');

const ruleBody = (selector: string): string => {
    const start = widgetScss.indexOf(`${selector} {`);
    expect(start, `không thấy rule ${selector}`).toBeGreaterThanOrEqual(0);

    return widgetScss.slice(start, widgetScss.indexOf('\n}', start));
};

describe('stylesheet của widget', () => {
    it('ô nhập tin không có chiều cao cố định (chiều cao cố định sinh ra thanh cuộn ▲▼ khi ô còn trống)', () => {
        const inputRule = ruleBody('.user-message-input');

        expect(inputRule).not.toMatch(/(^|\s)(min-)?h-\d/);
        expect(inputRule).not.toMatch(/(^|\s|;)(min-)?height\s*:/);
        expect(inputRule).toContain('overflow-y: hidden');
    });

    it('vùng tin nhắn cuộn được mà không có thanh cuộn hệ điều hành', () => {
        const containerRule = ruleBody('.conversation--container');

        expect(containerRule).toContain('no-scrollbar');
        expect(containerRule).toContain('overflow-y: auto');
    });

    it('nhãn biểu mẫu giữ nguyên chữ hoa/thường của câu tiếng Việt', () => {
        expect(ruleBody('\nlabel')).not.toContain('capitalize');
    });
});
