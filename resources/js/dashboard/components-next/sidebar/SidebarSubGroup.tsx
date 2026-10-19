import { useEffect, useState } from 'react';

import SidebarGroupLeaf from './SidebarGroupLeaf';
import SidebarGroupSeparator from './SidebarGroupSeparator';
import type { SidebarMenuChild } from './provider';

// Port từ sidebar/SidebarSubGroup.vue (scroll fade + sort menu lược — vào sau)
const MINIMIZED_SECTIONS_KEY = 'sidebar_minimized_sections';

const CHILDREN_TRUNK =
    "before:content-[''] before:absolute before:top-0 before:bottom-0 before:w-0.5 before:bg-n-slate-4 before:start-[-0.5rem]";

function getMinimizedSections(): Record<string, boolean> {
    try {
        const stored = JSON.parse(localStorage.getItem(MINIMIZED_SECTIONS_KEY) || '{}');
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch {
        return {};
    }
}

interface SidebarSubGroupProps {
    name: string;
    isExpanded?: boolean;
    label: string;
    icon?: SidebarMenuChild['icon'];
    children?: SidebarMenuChild[];
    activeChild?: SidebarMenuChild;
    collapsible?: boolean;
    showTreeLine?: boolean;
    endTreeLine?: boolean;
}

export default function SidebarSubGroup({
    name,
    isExpanded = false,
    label,
    icon = '',
    children = [],
    activeChild,
    collapsible = false,
    showTreeLine = false,
    endTreeLine = false,
}: SidebarSubGroupProps) {
    const [minimizedSections, setMinimizedSections] = useState(getMinimizedSections);

    const storageKey = name;
    const isSubGroupExpanded = !collapsible || !minimizedSections[storageKey];
    const hasActiveChild = children.some(child => child.name === activeChild?.name);
    const hasAccessibleItems = children.some(child => child.to);

    useEffect(() => {
        if (!collapsible || !hasActiveChild || isSubGroupExpanded) return;
        const sections = getMinimizedSections();
        delete sections[storageKey];
        try {
            localStorage.setItem(MINIMIZED_SECTIONS_KEY, JSON.stringify(sections));
        } catch {
            /* noop */
        }
        setMinimizedSections(sections);
    }, [collapsible, hasActiveChild, isSubGroupExpanded, storageKey]);

    if (!hasAccessibleItems) return null;

    const toggleSubGroup = () => {
        if (!collapsible) return;
        const sections = getMinimizedSections();
        if (isSubGroupExpanded) {
            sections[storageKey] = true;
        } else {
            delete sections[storageKey];
        }
        try {
            localStorage.setItem(MINIMIZED_SECTIONS_KEY, JSON.stringify(sections));
        } catch {
            /* noop */
        }
        setMinimizedSections(sections);
    };

    const shouldShowItem = (child: SidebarMenuChild) =>
        isSubGroupExpanded && (isExpanded || activeChild?.name === child.name);

    return (
        <li className="group/sidebar-section relative flex flex-col list-none min-w-0">
            {isExpanded ? (
                <SidebarGroupSeparator
                    label={label}
                    icon={icon}
                    collapsible={collapsible}
                    isExpanded={isSubGroupExpanded}
                    showTreeLine={showTreeLine}
                    endTreeLine={endTreeLine}
                    onToggle={toggleSubGroup}
                />
            ) : null}
            {children.length ? (
                <ul
                    className={[
                        'm-0 list-none reset-base relative group min-w-0',
                        collapsible ? 'ms-5' : '',
                        showTreeLine && !endTreeLine ? CHILDREN_TRUNK : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    <div className="min-w-0">
                        {children.map(child => (
                            <SidebarGroupLeaf
                                key={child.name}
                                label={child.label}
                                to={child.to ?? ''}
                                icon={child.icon}
                                badgeCount={child.badgeCount}
                                component={child.component}
                                active={activeChild?.name === child.name}
                                hideTreeLine={showTreeLine && !isExpanded}
                                thinTreeLine
                                hidden={!shouldShowItem(child)}
                            />
                        ))}
                    </div>
                </ul>
            ) : null}
        </li>
    );
}
