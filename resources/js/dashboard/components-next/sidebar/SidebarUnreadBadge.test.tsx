import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SidebarUnreadBadge from './SidebarUnreadBadge';

describe('badge chưa đọc ở sidebar', () => {
    it.each([
        [0, null],
        [7, '7'],
        [99, '99'],
        [100, '99+'],
        [1500, '99+'],
    ])('số %s hiện là %s', (count, shown) => {
        const { container } = render(<SidebarUnreadBadge count={count} />);

        expect(container.querySelector('[data-test-id="sidebar-unread-badge"]')?.textContent ?? null).toBe(shown);
    });
});
