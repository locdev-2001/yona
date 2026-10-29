import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import ContextMenu from 'dashboard/components/ui/ContextMenu';
import MenuItem from 'dashboard/components/widgets/conversation/contextMenu/MenuItem';
import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import type { ChannelIconInbox } from 'dashboard/components-next/icon/ChannelIcon';
import SidebarUnreadBadge from './SidebarUnreadBadge';

// Port từ sidebar/SidebarGroupLeaf.vue — tree-line connector giữ nguyên chuỗi class
const TREE_CONNECTOR =
    "child-item before:content-[''] before:absolute before:start-0 before:w-0.5 before:h-full before:bg-n-slate-4 first:before:rounded-t last:before:h-1/5 last:after:content-[''] last:after:absolute last:after:start-0 last:after:bottom-[calc(50%_-_2px)] last:after:h-3 last:after:w-2.5 last:after:border-b-2 last:after:border-s-2 last:after:rounded-es last:after:border-n-slate-4";

// Hành động trên một mục: mở bằng chuột phải hoặc nút ba chấm (luôn hiện trên màn cảm ứng).
export interface SidebarLeafAction {
    key: string;
    icon: string;
    label: string;
    onSelect: () => void;
}

interface SidebarGroupLeafProps {
    label: string;
    to: string;
    icon?: string | ReactNode;
    active?: boolean;
    badgeCount?: number;
    hideTreeLine?: boolean;
    thinTreeLine?: boolean;
    hidden?: boolean;
    component?: (props: { label: string; active: boolean; badgeCount?: number }) => ReactNode;
    actions?: SidebarLeafAction[];
}

// Port từ sidebar/ChannelLeaf.vue — nội dung mục Channels: icon kênh + nhãn +
// huy hiệu chưa đọc + cảnh báo mất phiên xác thực (Zalo/Facebook/…). Dùng qua
// prop `component` của SidebarGroupLeaf: SidebarSubGroup (mục lồng như Channels)
// chỉ chuyển tiếp `component`, không có field riêng cho danh tính kênh, nên
// menuItems.ts truyền dữ liệu inbox trực tiếp qua đây thay vì qua props phẳng.
export function SidebarChannelLeafContent({
    label,
    badgeCount = 0,
    inbox,
}: {
    label: string;
    badgeCount?: number;
    inbox: ChannelIconInbox & { reauthorization_required?: boolean };
}) {
    return (
        <>
            <span className="size-4 grid place-content-center rounded-full">
                <ChannelIcon inbox={inbox} className="size-4" />
            </span>
            <div className="flex-1 truncate min-w-0 text-sm">{label}</div>
            <SidebarUnreadBadge count={badgeCount} />
            {inbox.reauthorization_required ? (
                <span
                    title={t('SIDEBAR.REAUTHORIZE')}
                    className="grid place-content-center size-5 rounded-full bg-n-ruby-5/60 shrink-0"
                >
                    <Icon icon="i-lucide-triangle-alert" className="size-3 text-n-ruby-9" />
                </span>
            ) : null}
        </>
    );
}

export default function SidebarGroupLeaf({
    label,
    to,
    icon = null,
    active = false,
    badgeCount = 0,
    hideTreeLine = false,
    thinTreeLine = false,
    hidden = false,
    component,
    actions = [],
}: SidebarGroupLeafProps) {
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const hasActions = actions.length > 0;

    const openMenuAtPointer = (event: MouseEvent) => {
        event.preventDefault();
        setMenuPosition({ x: event.clientX, y: event.clientY });
    };

    const openMenuBelowButton = (event: MouseEvent<HTMLButtonElement>) => {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        setMenuPosition({ x: buttonRect.left, y: buttonRect.bottom + 4 });
    };

    return (
        <li
            className={[
                'group/leaf py-0.5 ps-2 ms-3 relative text-n-slate-11 min-w-0',
                hideTreeLine ? '' : TREE_CONNECTOR,
                !hideTreeLine && thinTreeLine ? 'before:!w-px last:after:!border-b last:after:!border-s' : '',
                hidden ? 'hidden' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <Link
                href={to}
                title={label}
                className={`flex h-8 items-center gap-2 px-2 py-1 rounded-lg ltr:hover:bg-gradient-to-r rtl:hover:bg-gradient-to-l from-transparent via-n-slate-3/70 to-n-slate-3/70 group min-w-0 ${
                    active ? 'text-n-slate-12 bg-n-surface-selected active' : ''
                } ${hasActions ? '[@media(hover:none)]:pe-9' : ''}`}
                onContextMenu={hasActions ? openMenuAtPointer : undefined}
            >
                {component ? (
                    component({ label, active, badgeCount })
                ) : (
                    <>
                        {icon ? (
                            <span className="size-4 grid place-content-center rounded-full">
                                <Icon icon={icon} className="size-4 inline-block" />
                            </span>
                        ) : null}
                        <div className="flex-1 truncate min-w-0 text-sm">{label}</div>
                        <SidebarUnreadBadge count={badgeCount} />
                    </>
                )}
            </Link>
            {hasActions ? (
                <button
                    type="button"
                    aria-label={t('SIDEBAR.ITEM_MENU', { name: label })}
                    aria-haspopup="menu"
                    aria-expanded={menuPosition !== null}
                    className={`absolute top-1/2 -translate-y-1/2 end-1 grid place-content-center size-7 rounded-md bg-n-slate-3 text-n-slate-11 hover:text-n-slate-12 focus-visible:opacity-100 [@media(hover:none)]:bg-transparent [@media(hover:none)]:opacity-100 ${
                        menuPosition ? 'opacity-100' : 'opacity-0 group-hover/leaf:opacity-100'
                    }`}
                    onClick={openMenuBelowButton}
                >
                    <Icon icon="i-lucide-ellipsis" className="size-4" />
                </button>
            ) : null}
            {menuPosition ? (
                <ContextMenu x={menuPosition.x} y={menuPosition.y} onClose={() => setMenuPosition(null)}>
                    <div role="menu" className="p-1 rounded-md overlay-surface">
                        {actions.map(action => (
                            <MenuItem
                                key={action.key}
                                label={action.label}
                                icon={action.icon}
                                className="w-max max-w-[calc(100vw-2rem)]"
                                onClick={() => {
                                    setMenuPosition(null);
                                    action.onSelect();
                                }}
                            />
                        ))}
                    </div>
                </ContextMenu>
            ) : null}
        </li>
    );
}
