import { isProductFeatureVisible, type ProductFeature } from 'shared/helpers/productVisibility';
import type { ComponentType } from 'react';

import { WIDGET_ROUTES, type WidgetRouteName } from '../router';
import ArticleScreen from './ArticleScreen';
import HelpCategoryScreen from './HelpCategoryScreen';
import HelpScreen from './HelpScreen';
import HelpSearchScreen from './HelpSearchScreen';
import HomeScreen from './HomeScreen';
import MessageListScreen from './MessageListScreen';
import RequestScreen from './RequestScreen';
import UpdateScreen from './UpdateScreen';
import UpdatesScreen from './UpdatesScreen';

/**
 * Màn → component. Màn nào có `tabBar` thì hiện thanh 4 tab bên dưới (màn gốc
 * của tab). Khung chat và form trước chat do App dựng riêng (header chat, composer).
 * Thêm màn mới: một file trong screens/ + một dòng ở đây.
 */
export const SCREENS: Partial<Record<WidgetRouteName, { Component: ComponentType; tabBar: boolean }>> = {
    [WIDGET_ROUTES.HOME]: { Component: HomeScreen, tabBar: true },
    [WIDGET_ROUTES.MESSAGE_LIST]: { Component: MessageListScreen, tabBar: true },
    [WIDGET_ROUTES.HELP]: { Component: HelpScreen, tabBar: true },
    [WIDGET_ROUTES.HELP_CATEGORY]: { Component: HelpCategoryScreen, tabBar: false },
    [WIDGET_ROUTES.HELP_SEARCH]: { Component: HelpSearchScreen, tabBar: false },
    [WIDGET_ROUTES.ARTICLE]: { Component: ArticleScreen, tabBar: false },
    [WIDGET_ROUTES.UPDATES]: { Component: UpdatesScreen, tabBar: true },
    [WIDGET_ROUTES.UPDATE]: { Component: UpdateScreen, tabBar: false },
    [WIDGET_ROUTES.REQUEST]: { Component: RequestScreen, tabBar: false },
};

const SCREEN_FEATURES: Partial<Record<WidgetRouteName, ProductFeature>> = {
    [WIDGET_ROUTES.HELP]: 'helpCenter',
    [WIDGET_ROUTES.HELP_CATEGORY]: 'helpCenter',
    [WIDGET_ROUTES.HELP_SEARCH]: 'helpCenter',
    [WIDGET_ROUTES.ARTICLE]: 'helpCenter',
    [WIDGET_ROUTES.UPDATES]: 'widgetUpdates',
    [WIDGET_ROUTES.UPDATE]: 'widgetUpdates',
    [WIDGET_ROUTES.REQUEST]: 'widgetRequests',
};

export function visibleWidgetRoute(route: WidgetRouteName): WidgetRouteName {
    const feature = SCREEN_FEATURES[route];
    return feature && !isProductFeatureVisible(feature) ? WIDGET_ROUTES.HOME : route;
}
