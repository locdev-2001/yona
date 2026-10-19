import { usePage } from '@inertiajs/react';

import { DropdownBody, DropdownContainer, DropdownItem } from 'dashboard/components-next/dropdown-menu/base';
import type { SidebarMenuChild, SidebarMenuItem } from './provider';

// Nút bánh răng cạnh hồ sơ ở chân sidebar: mở danh sách các trang Cài đặt mà
// người dùng được vào (lấy từ chính nhóm Settings của menu). Container không
// `relative` để menu căn theo chân sidebar như menu hồ sơ, không tràn khỏi màn.
export default function SidebarSettingsMenu({ item }: { item: SidebarMenuItem }) {
    const path = usePage().url.split('?')[0];
    const pages = (item.children ?? []).flatMap(child => child.children ?? child).filter(child => child.to);
    const isCurrentPage = (page: SidebarMenuChild) => path.startsWith(page.to!.split('?')[0]);
    const isActive = pages.some(isCurrentPage);

    if (pages.length === 0) return null;

    const menu = (
        <DropdownBody className="bottom-12 z-50 mb-2 w-60 ltr:left-1 rtl:right-1">
            {pages.map(page => (
                <DropdownItem
                    key={page.name}
                    label={page.label}
                    icon={typeof page.icon === 'string' ? page.icon : undefined}
                    link={page.to}
                    className={isCurrentPage(page) ? 'bg-n-alpha-2' : ''}
                />
            ))}
        </DropdownBody>
    );

    return (
        <DropdownContainer className="shrink-0" menu={menu}>
            {({ toggle, isOpen }) => (
                <button
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    aria-expanded={isOpen}
                    className={`grid place-content-center size-8 rounded-lg transition-colors hover:bg-n-surface-hover hover:text-n-slate-12 ${
                        isOpen || isActive ? 'bg-n-surface-hover text-n-slate-12' : 'text-n-slate-11'
                    }`}
                    onClick={toggle}
                >
                    <span className="i-lucide-settings size-[18px]" aria-hidden="true" />
                </button>
            )}
        </DropdownContainer>
    );
}
