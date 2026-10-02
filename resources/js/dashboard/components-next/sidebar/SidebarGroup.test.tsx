import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const visit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: '/app/accounts/2/dashboard', props: {} }),
    router: { visit },
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('dashboard/components-next/icon/Icon', () => ({ default: () => null }));

import SidebarGroup from './SidebarGroup';
import { SidebarContextProvider } from './provider';

const settingsGroup = {
    name: 'Settings',
    label: 'Cài đặt',
    children: [
        { name: 'Settings Account Settings', label: 'Cài đặt tài khoản', to: '/app/accounts/2/settings/general' },
        { name: 'Settings Agents', label: 'Nhân viên', to: '/app/accounts/2/settings/agents/list' },
    ],
};

function renderGroup(opensFirstChildOnExpand: boolean) {
    let expandedItem: string | null = null;
    const ui = () => (
        <SidebarContextProvider
            value={{
                expandedItem,
                setExpandedItem: name => {
                    expandedItem = expandedItem === name ? null : name;
                    rerender(ui());
                },
                isCollapsed: false,
                opensFirstChildOnExpand,
                isResizing: false,
                sidebarWidth: 200,
                activePopover: null,
                setActivePopover: () => undefined,
                scheduleClose: () => undefined,
                cancelClose: () => undefined,
            }}
        >
            <ul>
                <SidebarGroup accountId={2} {...settingsGroup} />
            </ul>
        </SidebarContextProvider>
    );
    const { rerender } = render(ui());
}

describe('bấm tiêu đề nhóm có menu con', () => {
    beforeEach(() => visit.mockClear());

    it('ngăn kéo điện thoại: chỉ xổ menu con, không sang trang', () => {
        renderGroup(false);

        fireEvent.click(screen.getByTitle('Cài đặt'));

        expect(visit).not.toHaveBeenCalled();
        expect(screen.getByText('Nhân viên').closest('ul')?.className).not.toContain('hidden');
    });

    it('máy tính: xổ menu con và mở luôn mục con đầu tiên', () => {
        renderGroup(true);

        fireEvent.click(screen.getByTitle('Cài đặt'));

        expect(visit).toHaveBeenCalledWith('/app/accounts/2/settings/general');
    });
});
