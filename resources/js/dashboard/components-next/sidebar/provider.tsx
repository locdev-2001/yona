import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { putJson } from 'dashboard/helper/apiClient';
import type { SharedPageProps } from '../../../types';

// Port từ components-next/sidebar/provider.js — context + resize/collapse.
// sidebar_width lưu vào ui_settings qua /api/v1/profile như Chatwoot.

export const DEFAULT_WIDTH = 200;
export const MIN_WIDTH = 56;
export const COLLAPSED_THRESHOLD = 160;
export const MAX_WIDTH = 320;

export interface SidebarMenuChild {
    name: string;
    label: string;
    icon?: string | ReactNode;
    to?: string;
    activeOn?: string[];
    badgeCount?: number;
    children?: SidebarMenuChild[];
    collapsible?: boolean;
    showTreeLine?: boolean;
    component?: (props: { label: string; active: boolean; badgeCount?: number }) => ReactNode;
}

export interface SidebarMenuItem extends SidebarMenuChild {
    getterKeys?: { count?: number; badge?: boolean };
}

interface SidebarContextValue {
    expandedItem: string | null;
    setExpandedItem: (name: string) => void;
    isCollapsed: boolean;
    isResizing: boolean;
    sidebarWidth: number;
    activePopover: string | null;
    setActivePopover: (name: string | null) => void;
    scheduleClose: (delay?: number) => void;
    cancelClose: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebarContext(): SidebarContextValue {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('Component is missing a parent <Sidebar /> component.');
    return context;
}

export const SidebarContextProvider = SidebarContext.Provider;

function persistSidebarWidth(width: number): void {
    void putJson('/api/v1/profile', { ui_settings: { sidebar_width: width } });
}

export function useSidebarResize() {
    const { auth } = usePage<SharedPageProps>().props;
    const storedWidth = Number(auth.user?.ui_settings?.sidebar_width);

    const [sidebarWidth, setWidthState] = useState(
        Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : DEFAULT_WIDTH,
    );
    const isCollapsed = sidebarWidth < COLLAPSED_THRESHOLD;

    const setSidebarWidth = (width: number) => {
        setWidthState(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)));
    };

    const widthRef = useRef(sidebarWidth);
    widthRef.current = sidebarWidth;

    const saveWidth = () => persistSidebarWidth(widthRef.current);

    const snapToCollapsed = () => {
        setWidthState(MIN_WIDTH);
        persistSidebarWidth(MIN_WIDTH);
    };

    const snapToExpanded = () => {
        setWidthState(DEFAULT_WIDTH);
        persistSidebarWidth(DEFAULT_WIDTH);
    };

    return { sidebarWidth, widthRef, isCollapsed, setSidebarWidth, saveWidth, snapToCollapsed, snapToExpanded };
}
