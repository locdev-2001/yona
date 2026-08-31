import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Port từ components-next/sidebar/provider.js — context + resize/collapse.
// Chatwoot lưu sidebar_width vào ui_settings (server); tạm localStorage,
// chuyển sang ui_settings ở A4 (profile settings).

export const DEFAULT_WIDTH = 200;
export const MIN_WIDTH = 56;
export const COLLAPSED_THRESHOLD = 160;
export const MAX_WIDTH = 320;

const WIDTH_STORAGE_KEY = 'sidebar_width';

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

export function readStoredSidebarWidth(): number {
    try {
        const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
        return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_WIDTH;
    } catch {
        return DEFAULT_WIDTH;
    }
}

export function persistSidebarWidth(width: number): void {
    try {
        localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    } catch {
        /* storage không khả dụng */
    }
}

export function useSidebarResize() {
    const [sidebarWidth, setWidthState] = useState(readStoredSidebarWidth);
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
