import { useEffect, useState } from 'react';

// Thay vue-router createWebHashHistory: widget chạy trong iframe nên điều hướng
// bằng hash để không đụng lịch sử của trang khách.
export const WIDGET_ROUTES = {
    HOME: 'home',
    MESSAGES: 'messages',
    PRECHAT_FORM: 'prechat-form',
    UNREAD_MESSAGES: 'unread-messages',
} as const;

export type WidgetRouteName = (typeof WIDGET_ROUTES)[keyof typeof WIDGET_ROUTES];

const PATH_BY_ROUTE: Record<WidgetRouteName, string> = {
    home: '/',
    messages: '/messages',
    'prechat-form': '/prechat-form',
    'unread-messages': '/unread-messages',
};

const ROUTE_BY_PATH: Record<string, WidgetRouteName> = {
    '/': WIDGET_ROUTES.HOME,
    '/messages': WIDGET_ROUTES.MESSAGES,
    '/prechat-form': WIDGET_ROUTES.PRECHAT_FORM,
    '/unread-messages': WIDGET_ROUTES.UNREAD_MESSAGES,
};

export const currentRoute = (): WidgetRouteName => {
    const path = window.location.hash.replace(/^#/, '') || '/';
    return ROUTE_BY_PATH[path] ?? WIDGET_ROUTES.HOME;
};

// router.replace: đổi hash mà không thêm mục lịch sử.
export const replaceRoute = (name: WidgetRouteName): void => {
    const nextHash = `#${PATH_BY_ROUTE[name]}`;
    if (window.location.hash === nextHash) return;
    window.location.replace(`${window.location.pathname}${window.location.search}${nextHash}`);
};

export function useWidgetRoute(): WidgetRouteName {
    const [route, setRoute] = useState<WidgetRouteName>(currentRoute);

    useEffect(() => {
        const onHashChange = () => setRoute(currentRoute());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    return route;
}
