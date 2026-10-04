import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as helpCenterApi from '../api/helpCenter';
import { t } from '../i18n';
import { DEFAULT_WIDGET_SETTINGS } from '../../dashboard/settings/inboxes/widget-builder/draft';
import { resetRouterForTests, WIDGET_ROUTES } from '../router';
import { conversationList } from '../store/conversationList';
import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact } from '../types';
import TabBar from '../ui/TabBar';
import HomeScreen from './HomeScreen';
import { visibleWidgetRoute } from './registry';

beforeEach(() => {
    vi.spyOn(helpCenterApi, 'fetchArticles').mockResolvedValue({ payload: [] });
    resetRouterForTests();
    widgetStore.clearConversations();
    conversationList.reset();
    vi.spyOn(conversationList, 'load').mockResolvedValue(undefined);
    widgetStore.setChannelConfig({
        websiteName: 'Gốm Mộc',
        portal: { slug: 'gom-moc', name: 'Trợ giúp', defaultLocale: 'vi', locales: ['vi'] },
        widgetSettings: {
            ...DEFAULT_WIDGET_SETTINGS,
            home: { blocks: { ...DEFAULT_WIDGET_SETTINGS.home.blocks, help: true, request: true } },
        },
    } as unknown as ChannelConfig, {}, {} as WidgetContact);
});

describe('giao diện widget tinh gọn', () => {
    it('chỉ giữ hai tab Trang chủ và Tin nhắn dù đã gắn Help Center', () => {
        render(<TabBar />);
        expect(screen.getAllByRole('button')).toHaveLength(2);
        expect(screen.queryByText(t('TABS.HELP'))).not.toBeInTheDocument();
        expect(screen.queryByText(t('TABS.UPDATES'))).not.toBeInTheDocument();
    });

    it('ẩn khối Help và yêu cầu sắp ra mắt dù cấu hình đã bật', () => {
        render(<HomeScreen />);
        expect(screen.queryByText(t('HOME.COMING_SOON'))).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: t('HOME.SEARCH_PLACEHOLDER') })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('HOME.SEND_NEW') })).toBeInTheDocument();
        expect(helpCenterApi.fetchArticles).not.toHaveBeenCalled();
    });

    it.each([
        WIDGET_ROUTES.HELP, WIDGET_ROUTES.HELP_SEARCH, WIDGET_ROUTES.HELP_CATEGORY,
        WIDGET_ROUTES.ARTICLE, WIDGET_ROUTES.UPDATES, WIDGET_ROUTES.UPDATE, WIDGET_ROUTES.REQUEST,
    ])('màn %s bị ẩn đưa về Trang chủ', route => {
        expect(visibleWidgetRoute(route)).toBe(WIDGET_ROUTES.HOME);
    });

    it('giữ luồng chat và chiến dịch đang chạy', () => {
        expect(visibleWidgetRoute(WIDGET_ROUTES.MESSAGES)).toBe(WIDGET_ROUTES.MESSAGES);
        expect(visibleWidgetRoute(WIDGET_ROUTES.CAMPAIGNS)).toBe(WIDGET_ROUTES.CAMPAIGNS);
    });
});
