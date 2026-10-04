import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const filters = vi.hoisted(() => ({ setStatusFilter: vi.fn(), setSortFilter: vi.fn() }));
vi.mock('../ConversationContext', () => ({ useConversation: () => ({ ...filters, status: 'open', sortBy: 'priority_desc' }) }));
vi.mock('dashboard/components-next/selectmenu/SelectMenu', () => ({ default: ({ value, label, options }: { value: string; label: string; options: { value: string; label: string }[] }) => <div data-testid={`select-${value}`}><span>{label}</span><select aria-label={`options-${value}`} defaultValue="">{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div> }));

import ConversationBasicFilter from './ConversationBasicFilter';
import { t } from '../../../i18n';

describe('Sắp xếp hội thoại tinh gọn', () => {
    it('ẩn các lựa chọn priority nhưng giữ nhãn sắp xếp đã lưu mà không ghi lại filter', () => {
        render(<ConversationBasicFilter isOpen />);
        const selectedSort = screen.getByTestId('select-priority_desc');
        expect(selectedSort.querySelector('span')?.textContent).toBe(t('CHAT_LIST.SORT_ORDER_ITEMS.priority_desc.TEXT'));
        const choices = Array.from(selectedSort.querySelectorAll('option')).map(option => option.value);
        expect(choices).toContain('last_activity_at_desc');
        expect(choices.some(value => value.startsWith('priority_'))).toBe(false);
        expect(filters.setSortFilter).not.toHaveBeenCalled();
        expect(filters.setStatusFilter).not.toHaveBeenCalled();
    });
});
