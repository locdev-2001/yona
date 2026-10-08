import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ActiveFilterPreview, { attributePreviewLabel, operatorPreviewLabel } from './ActiveFilterPreview';
import type { ConversationFilterCondition, FilterType } from './helper/filterHelper';
import { setLocale } from '../../../i18n';

const labelsFilterType: FilterType = {
    attributeKey: 'labels',
    value: 'labels',
    attributeName: 'Nhãn',
    label: 'Nhãn',
    inputType: 'multiSelect',
    dataType: 'text',
    filterOperators: [],
    attributeModel: 'standard',
};

const labelsFilter: ConversationFilterCondition = {
    attributeKey: 'labels',
    filterOperator: 'equal_to',
    values: [{ id: 'Khách mua lại', name: 'Khách mua lại' }],
    queryOperator: 'and',
};

const noop = () => undefined;

afterEach(() => setLocale('en'));

describe('chip bộ lọc đang áp dụng', () => {
    it('hiện tên thuộc tính và toán tử đã dịch thay cho key thô', () => {
        setLocale('vi');
        const { container } = render(
            <ActiveFilterPreview
                appliedFilters={[labelsFilter, { ...labelsFilter, filterOperator: 'is_present', values: null }]}
                filterTypes={[labelsFilterType]}
                onClearFilters={noop}
                onOpenFilter={noop}
            />,
        );

        expect(container.textContent).toContain('Nhãn');
        expect(container.textContent).toContain('là');
        expect(container.textContent).toContain('Khách mua lại');
        expect(container.textContent).toContain('VÀ');
        expect(container.textContent).not.toMatch(/labels|\bis\b|\band\b/i);
    });

    it.each([
        ['equal_to', 'là', 'is'],
        ['not_equal_to', 'không là', 'is not'],
        ['contains', 'chứa', 'contains'],
        ['does_not_contain', 'không chứa', 'does not contain'],
        ['is_present', 'có giá trị', 'is present'],
        ['is_not_present', 'không có giá trị', 'is not present'],
        ['is_greater_than', 'lớn hơn', 'is greater than'],
        ['is_less_than', 'nhỏ hơn', 'is less than'],
        ['days_before', 'trước (số ngày)', 'days before'],
        ['starts_with', 'bắt đầu bằng', 'starts with'],
    ])('toán tử %s dịch theo locale', (operator, vietnamese, english) => {
        setLocale('vi');
        expect(operatorPreviewLabel(operator)).toBe(vietnamese);
        setLocale('en');
        expect(operatorPreviewLabel(operator)).toBe(english);
    });

    it('toán tử lạ rơi về key bỏ gạch dưới thay vì key i18n', () => {
        expect(operatorPreviewLabel('some_new_operator')).toBe('some new operator');
    });

    it('thuộc tính không có trong danh sách bộ lọc rơi về key bỏ gạch dưới', () => {
        expect(attributePreviewLabel('labels', [labelsFilterType])).toBe('Nhãn');
        expect(attributePreviewLabel('order_code', [labelsFilterType])).toBe('order code');
    });
});
