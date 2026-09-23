import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { landingConfigFixture, legalBundle, legalDocumentFixture, notFoundFixture } from '../test-support/landingConfigFixture';
import { LegalDocument } from './LegalDocument';

function renderDocument(key: 'terms' | 'privacy') {
    const legalDoc = legalDocumentFixture(key);
    render(<LegalDocument config={landingConfigFixture(key, { legalDocument: legalDoc })} />);

    return legalDoc;
}

/** Mọi chuỗi lá của một cây bản dịch. */
function leafStrings(tree: unknown): string[] {
    if (typeof tree === 'string') {
        return [tree];
    }

    return Object.values(tree as Record<string, unknown>).flatMap(leafStrings);
}

describe('LegalDocument', () => {
    it.each(['terms', 'privacy'] as const)('hiện đủ mọi mục của %s theo đúng thứ tự', key => {
        const legalDoc = renderDocument(key);

        expect(screen.getByRole('heading', { level: 1, name: legalDoc.title })).toBeInTheDocument();
        expect(screen.getByText(legalDoc.updated)).toBeInTheDocument();

        const headings = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
        expect(headings).toEqual(Object.values(legalDoc.sections).map(section => section.heading));
    });

    // Mục nào cũng gửi link thẳng được, ví dụ chỉ khách tới đúng đoạn nói về
    // phiên Zalo thay vì bảo họ cuộn tìm.
    it('gắn id theo khoá của mục để dẫn link thẳng tới mục đó', () => {
        renderDocument('privacy');

        const zaloSession = document.getElementById('zalo_session');
        expect(zaloSession).not.toBeNull();
        expect(within(zaloSession as HTMLElement).getByText(/0600/)).toBeInTheDocument();
    });

    it('chỉ sang văn bản còn lại ở cuối trang', () => {
        const legalDoc = renderDocument('terms');

        const link = screen.getByRole('link', { name: legalDoc.related.label });
        expect(link).toHaveAttribute('href', 'https://yona.test/chinh-sach-rieng-tu');
    });

    it('không hiện gì khi máy chủ không đẩy văn bản xuống', () => {
        const { container } = render(<LegalDocument config={landingConfigFixture('terms')} />);

        expect(container).toBeEmptyDOMElement();
    });

    // Luật bề mặt công khai: không gạch dài trong chuỗi hiển thị.
    it.each(['vi', 'en'] as const)('bản %s không có gạch dài', locale => {
        const strings = [...leafStrings(legalBundle(locale)), ...leafStrings(notFoundFixture(locale))];

        expect(strings.filter(text => /[—–]/.test(text))).toEqual([]);
    });
});
