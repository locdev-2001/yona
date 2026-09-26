import { useSyncExternalStore } from 'react';

// Điều hướng của widget: một ngăn xếp màn trong bộ nhớ (iframe không cần URL).
// Mỗi tab có màn gốc; mở màn con (hội thoại, bài viết…) là đẩy lên ngăn xếp, "quay
// lại" là rút xuống. API cũ (currentRoute/replaceRoute/useWidgetRoute) giữ nguyên
// nghĩa cho mã đang gọi: replaceRoute đưa ngăn xếp về đúng một màn.

export const WIDGET_ROUTES = {
    HOME: 'home',
    /** Khung chat của hội thoại đang mở. */
    MESSAGES: 'messages',
    /** Tab Tin nhắn: danh sách hội thoại. */
    MESSAGE_LIST: 'message-list',
    PRECHAT_FORM: 'prechat-form',
    UNREAD_MESSAGES: 'unread-messages',
    CAMPAIGNS: 'campaigns',
    HELP: 'help',
    HELP_CATEGORY: 'help-category',
    HELP_SEARCH: 'help-search',
    ARTICLE: 'article',
    UPDATES: 'updates',
    UPDATE: 'update',
    REQUEST: 'request',
} as const;

export type WidgetRouteName = (typeof WIDGET_ROUTES)[keyof typeof WIDGET_ROUTES];

export type WidgetTab = 'home' | 'messages' | 'help' | 'updates';

export interface RouteEntry {
    name: WidgetRouteName;
    params?: Record<string, string | number>;
}

const TAB_ROOT: Record<WidgetTab, WidgetRouteName> = {
    home: WIDGET_ROUTES.HOME,
    messages: WIDGET_ROUTES.MESSAGE_LIST,
    help: WIDGET_ROUTES.HELP,
    updates: WIDGET_ROUTES.UPDATES,
};

/** Tab chứa một màn — để thanh tab tô đúng mục khi đang ở màn con. */
export const tabOf = (name: WidgetRouteName): WidgetTab | null => {
    switch (name) {
        case WIDGET_ROUTES.HOME:
        case WIDGET_ROUTES.REQUEST:
            return 'home';
        case WIDGET_ROUTES.MESSAGE_LIST:
        case WIDGET_ROUTES.MESSAGES:
            return 'messages';
        case WIDGET_ROUTES.HELP:
        case WIDGET_ROUTES.HELP_CATEGORY:
        case WIDGET_ROUTES.HELP_SEARCH:
        case WIDGET_ROUTES.ARTICLE:
            return 'help';
        case WIDGET_ROUTES.UPDATES:
        case WIDGET_ROUTES.UPDATE:
            return 'updates';
        default:
            return null;
    }
};

let stack: RouteEntry[] = [{ name: WIDGET_ROUTES.HOME }];
const listeners = new Set<() => void>();

function setStack(next: RouteEntry[]): void {
    stack = next.length ? next : [{ name: WIDGET_ROUTES.HOME }];
    listeners.forEach(listener => listener());
}

const top = (): RouteEntry => stack[stack.length - 1];

export const currentRoute = (): WidgetRouteName => top().name;

export const currentEntry = (): RouteEntry => top();

/** Đưa ngăn xếp về đúng một màn (nghĩa cũ của hash router). */
export const replaceRoute = (name: WidgetRouteName, params?: RouteEntry['params']): void => {
    if (stack.length === 1 && top().name === name && JSON.stringify(top().params) === JSON.stringify(params)) return;
    setStack([{ name, params }]);
};

/** Mở màn con trên màn hiện tại. */
export const pushRoute = (name: WidgetRouteName, params?: RouteEntry['params']): void => {
    setStack([...stack, { name, params }]);
};

/** Quay lại; ở màn gốc của một tab con thì về màn gốc của tab đó, rồi về Home. */
export const popRoute = (): void => {
    if (stack.length > 1) {
        setStack(stack.slice(0, -1));

        return;
    }

    const tab = tabOf(top().name);
    const root = tab ? TAB_ROOT[tab] : WIDGET_ROUTES.HOME;
    setStack([{ name: root === top().name ? WIDGET_ROUTES.HOME : root }]);
};

export const canGoBack = (): boolean => stack.length > 1 || top().name !== WIDGET_ROUTES.HOME;

export const switchTab = (tab: WidgetTab): void => setStack([{ name: TAB_ROOT[tab] }]);

const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

export function useRouteEntry(): RouteEntry {
    return useSyncExternalStore(subscribe, top, top);
}

export function useWidgetRoute(): WidgetRouteName {
    return useRouteEntry().name;
}

/** Chỉ dùng trong test: về trạng thái ban đầu. */
export const resetRouterForTests = (): void => setStack([{ name: WIDGET_ROUTES.HOME }]);
