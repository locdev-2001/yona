import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import SidebarUnreadBadge from './SidebarUnreadBadge';

// Port từ sidebar/SidebarGroupLeaf.vue — tree-line connector giữ nguyên chuỗi class
const TREE_CONNECTOR =
    "child-item before:content-[''] before:absolute before:start-0 before:w-0.5 before:h-full before:bg-n-slate-4 first:before:rounded-t last:before:h-1/5 last:after:content-[''] last:after:absolute last:after:start-0 last:after:bottom-[calc(50%_-_2px)] last:after:h-3 last:after:w-2.5 last:after:border-b-2 last:after:border-s-2 last:after:rounded-es last:after:border-n-slate-4";

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
}: SidebarGroupLeafProps) {
    return (
        <li
            className={[
                'py-0.5 ps-2 ms-3 relative text-n-slate-11 min-w-0',
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
                    active ? 'text-n-slate-12 bg-n-alpha-2 active' : ''
                }`}
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
        </li>
    );
}
