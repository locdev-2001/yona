import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { focusOnMount } from 'shared/helpers/focusOnMount';

import { DropdownContainer, DropdownItem } from './index';

// DropdownItem.vue: lớp `gap-3 hover:bg-n-alpha-2 rounded-lg` chỉ bị bỏ khi có
// DEFAULT slot; slot có tên #icon/#label vẫn giữ nguyên lớp đó.
const renderItem = (item: React.ReactNode) =>
    render(<DropdownContainer menu={null}>{() => item}</DropdownContainer>);

const itemClasses = (container: HTMLElement) =>
    (container.querySelector('.n-dropdown-item > *') as HTMLElement).className;

describe('DropdownItem', () => {
    it('keeps the gap and hover classes for the icon/label props', () => {
        const { container } = renderItem(<DropdownItem label="Assign to Agent" icon="i-lucide-user" />);

        expect(itemClasses(container)).toContain('gap-3');
        expect(itemClasses(container)).toContain('hover:bg-n-alpha-2');
    });

    it('keeps the gap and hover classes for named icon/label slots', () => {
        const { container, getByText } = renderItem(
            <DropdownItem iconSlot={<span>dot</span>} labelSlot={<span>Assign a Team</span>} />,
        );

        expect(itemClasses(container)).toContain('gap-3');
        expect(getByText('dot')).not.toBeNull();
        expect(getByText('Assign a Team')).not.toBeNull();
    });

    it('drops the gap and hover classes for the default slot', () => {
        const { container } = renderItem(<DropdownItem>No results</DropdownItem>);

        expect(itemClasses(container)).not.toContain('gap-3');
        expect(itemClasses(container)).not.toContain('hover:bg-n-alpha-2');
    });
});

// `v-focus` của gốc: ô tìm kiếm trong menu được focus ngay khi menu mở. Menu do
// DropdownContainer render nên useEffect của component cha KHÔNG chạy lại — phải
// focus bằng ref callback.
describe('focusOnMount trong menu của DropdownContainer', () => {
    it('focuses the search input as soon as the menu opens', () => {
        const { getByRole, getByPlaceholderText } = render(
            <DropdownContainer menu={<input ref={focusOnMount} placeholder="Search..." />}>
                {({ toggle }) => (
                    <button type="button" onClick={toggle}>
                        open
                    </button>
                )}
            </DropdownContainer>,
        );

        fireEvent.click(getByRole('button', { name: 'open' }));

        expect(document.activeElement).toBe(getByPlaceholderText('Search...'));
    });
});
