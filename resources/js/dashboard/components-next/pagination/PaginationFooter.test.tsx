import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import PaginationFooter from './PaginationFooter';

afterEach(() => {
    document.documentElement.lang = 'en';
});

describe('PaginationFooter', () => {
    // Bản port ghim `currentPage: ''` nên nhãn ra "Trang /3" — số trang hiện tại biến mất.
    it('in số trang hiện tại, không bỏ trống', () => {
        const { container } = render(<PaginationFooter currentPage={2} totalItems={40} onPageChange={vi.fn()} />);

        expect(container.textContent).toMatch(/2 of 3/);
    });

    // Gốc ghim Intl locale 'en' → "3,185" ở mọi ngôn ngữ; tiếng Việt phải là "3.185".
    it('định dạng số theo locale của trang', () => {
        const render200 = () => render(<PaginationFooter currentPage={200} totalItems={5000} onPageChange={vi.fn()} />);

        document.documentElement.lang = 'en';
        expect(render200().container.textContent).toContain('3,185');

        document.documentElement.lang = 'vi';
        expect(render200().container.textContent).toContain('3.185');
    });
});
