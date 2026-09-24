import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SearchSuggestions from './SearchSuggestions';
import type { PortalSearchArticle } from '../types';

function article(content: string, title = 'Hướng dẫn đổi trả'): PortalSearchArticle {
    return { id: 1, category_id: null, title, content, link: '/hc/doi-tra' };
}

function renderSuggestions(items: PortalSearchArticle[], searchTerm: string) {
    return render(
        <SearchSuggestions
            items={items}
            isLoading={false}
            searchTerm={searchTerm}
            emptyPlaceholder="Không có kết quả"
            loadingPlaceholder="Đang tìm"
        />,
    ).container;
}

const contentLine = (container: HTMLElement) => container.querySelector('.line-clamp-1') as HTMLElement;

describe('SearchSuggestions tô sáng từ khoá', () => {
    it('bọc mọi lần khớp, không phân biệt hoa thường', () => {
        const container = renderSuggestions([article('Đổi trả trong 7 ngày. ĐỔI TRẢ miễn phí.')], 'đổi trả');

        const highlighted = [...contentLine(container).querySelectorAll('span')].map(span => span.textContent);
        expect(highlighted).toEqual(['Đổi trả', 'ĐỔI TRẢ']);
    });

    it('nội dung chứa HTML hiện thành chữ, không thành thẻ', () => {
        const container = renderSuggestions([article('<img src=x onerror=alert(1)> đổi trả')], 'đổi');

        expect(contentLine(container).querySelector('img')).toBeNull();
        expect(contentLine(container).textContent).toBe('<img src=x onerror=alert(1)> đổi trả');
    });

    it('từ khoá trùng một phần thực thể HTML không làm vỡ chữ', () => {
        const container = renderSuggestions([article("Shop's 39 & amp")], '39');

        expect(contentLine(container).textContent).toBe("Shop's 39 & amp");
        expect(contentLine(container).querySelector('span')?.textContent).toBe('39');
    });

    it('từ khoá có ký tự đặc biệt vẫn khớp đúng chữ gốc', () => {
        const container = renderSuggestions([article('Giá <100k> & quà tặng')], '<100k> &');

        expect(contentLine(container).querySelector('span')?.textContent).toBe('<100k> &');
    });
});
