import { describe, expect, it } from 'vitest';

import { EXTERNAL_LINK_PROPS, messageMarkdownHtml, sanitizeMessageHtml, withExternalLinkTargets } from './externalLinks';

function anchorsOf(html: string): HTMLAnchorElement[] {
    const template = document.createElement('template');
    template.innerHTML = html;

    return Array.from(template.content.querySelectorAll('a'));
}

function expectOpensInNewTab(anchor: HTMLAnchorElement | undefined) {
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toContain('noopener');
    expect(anchor?.getAttribute('rel')).toContain('noreferrer');
}

describe('liên kết trong nội dung tin luôn mở tab mới', () => {
    it.each([
        ['URL trần', 'Xem https://shop.test/sp-1 nhé'],
        ['link markdown', '[Bảng giá](https://shop.test/bang-gia)'],
        ['www không scheme', 'Vào www.shop.vn nhé'],
    ])('%s trong markdown', (_, content) => {
        const anchors = anchorsOf(messageMarkdownHtml(content));

        expect(anchors).toHaveLength(1);
        expectOpensInNewTab(anchors[0]);
    });

    it('HTML dựng sẵn không có target vẫn được gắn, rel cũ bị thay', () => {
        const [anchor] = anchorsOf(sanitizeMessageHtml('<a href="https://shop.test" rel="opener" target="_self">x</a>'));

        expectOpensInNewTab(anchor);
        expect(anchor.getAttribute('rel')).toBe(EXTERNAL_LINK_PROPS.rel);
    });

    it('vẫn lọc href nguy hiểm', () => {
        const [anchor] = anchorsOf(sanitizeMessageHtml('<a href="javascript:alert(1)">x</a>'));

        expect(anchor?.hasAttribute('href')).toBe(false);
    });

    it('thư HTML đã lọc: mọi liên kết mở tab mới, giữ nguyên phần còn lại', () => {
        const html = withExternalLinkTargets('<p style="color:red">Chào <a href="https://shop.test/a">A</a> <a href="mailto:a@shop.test">B</a></p>');
        const anchors = anchorsOf(html);

        expect(anchors).toHaveLength(2);
        anchors.forEach(expectOpensInNewTab);
        expect(html).toContain('style="color:red"');
    });
});
