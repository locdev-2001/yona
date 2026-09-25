import { beforeEach, describe, expect, it } from 'vitest';

import { canGoBack, currentEntry, currentRoute, popRoute, pushRoute, replaceRoute, resetRouterForTests, switchTab, tabOf, WIDGET_ROUTES } from './router';

beforeEach(() => resetRouterForTests());

describe('điều hướng ngăn xếp của widget', () => {
    it('mở màn con rồi quay lại đúng màn trước', () => {
        switchTab('help');
        pushRoute(WIDGET_ROUTES.HELP_CATEGORY, { id: 3 });
        pushRoute(WIDGET_ROUTES.ARTICLE, { id: 12 });

        expect(currentEntry()).toEqual({ name: 'article', params: { id: 12 } });
        popRoute();
        expect(currentEntry()).toEqual({ name: 'help-category', params: { id: 3 } });
    });

    it('đổi tab đưa ngăn xếp về màn gốc của tab', () => {
        pushRoute(WIDGET_ROUTES.MESSAGES);
        switchTab('updates');

        expect(currentRoute()).toBe('updates');
        popRoute();
        expect(currentRoute()).toBe('home');
    });

    it('khung chat mở thẳng (không qua danh sách) quay lại thì về danh sách hội thoại', () => {
        replaceRoute(WIDGET_ROUTES.MESSAGES);

        expect(canGoBack()).toBe(true);
        popRoute();
        expect(currentRoute()).toBe('message-list');
    });

    it('ở Home thì không còn gì để quay lại', () => {
        expect(canGoBack()).toBe(false);
    });

    it('màn con tô đúng tab', () => {
        expect(tabOf(WIDGET_ROUTES.ARTICLE)).toBe('help');
        expect(tabOf(WIDGET_ROUTES.MESSAGES)).toBe('messages');
        expect(tabOf(WIDGET_ROUTES.CAMPAIGNS)).toBeNull();
    });
});
