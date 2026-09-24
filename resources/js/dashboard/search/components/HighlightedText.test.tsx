import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SEARCH_MATCH_CLASS } from 'dashboard/helper/searchHighlight';
import HighlightedText from './HighlightedText';

describe('HighlightedText', () => {
    it('tô nền đoạn khớp để thấy được cả trên tên vốn đã đậm vừa', () => {
        const { container } = render(<HighlightedText text="Nguyễn Văn Đức" query="duc" className="font-medium" />);
        const marks = container.querySelectorAll('mark');

        expect(marks).toHaveLength(1);
        expect(marks[0].textContent).toBe('Đức');
        expect(marks[0].className).toBe(SEARCH_MATCH_CLASS);
        expect(SEARCH_MATCH_CLASS).toMatch(/\bbg-n-amber-4\b/);
        expect(SEARCH_MATCH_CLASS).not.toMatch(/bg-transparent/);
    });

    it('không bọc gì khi không có đoạn khớp', () => {
        const { container } = render(<HighlightedText text="Nguyễn Văn Đức" query="lan" />);

        expect(container.querySelector('mark')).toBeNull();
        expect(container.textContent).toBe('Nguyễn Văn Đức');
    });
});
