import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiGet, apiPost, setPreviewMode, WidgetApiError } from '../api/client';
import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact } from '../types';
import { DEFAULT_WIDGET_SETTINGS } from './widgetSettings';
import { listenForPreviewConfig } from './previewMode';

afterEach(() => {
    setPreviewMode(false);
    vi.unstubAllGlobals();
});

describe('khung xem trước của màn cấu hình widget', () => {
    it('không ghi gì lên máy chủ; đọc (GET) và /config vẫn đi', async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 200 })));
        vi.stubGlobal('fetch', fetchMock);
        setPreviewMode(true);

        await expect(apiPost('/api/v1/widget/messages?website_token=x', { message: {} })).rejects.toBeInstanceOf(WidgetApiError);
        await apiPost('/api/v1/widget/config?website_token=x');
        await apiGet('/api/v1/widget/conversations/list?website_token=x');

        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            '/api/v1/widget/config?website_token=x',
            '/api/v1/widget/conversations/list?website_token=x',
        ]);
    });

    it('chỉ nhận cấu hình từ chính origin; áp màu và cấu hình ngay', () => {
        widgetStore.setChannelConfig(
            { widgetColor: '#1f6feb', websiteName: 'Gốm Mộc', widgetSettings: DEFAULT_WIDGET_SETTINGS } as unknown as ChannelConfig,
            {},
            {} as WidgetContact,
        );
        const stop = listenForPreviewConfig();
        const settings = { ...DEFAULT_WIDGET_SETTINGS, appearance: { ...DEFAULT_WIDGET_SETTINGS.appearance, greeting: 'Shop giúp gì được?' } };

        window.dispatchEvent(new MessageEvent('message', { origin: 'https://la.vn', data: { type: 'yona-preview:config', config: { widgetColor: '#000000' } } }));
        expect(widgetStore.getState().channelConfig?.widgetColor).toBe('#1f6feb');

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: window.location.origin,
                data: { type: 'yona-preview:config', config: { widgetColor: '#c2410c', welcomeTitle: 'Chào bạn!', widgetSettings: settings } },
            }),
        );
        expect(widgetStore.getState().channelConfig?.widgetColor).toBe('#c2410c');
        expect(widgetStore.getState().channelConfig?.welcomeTitle).toBe('Chào bạn!');
        expect(widgetStore.getState().channelConfig?.widgetSettings.appearance.greeting).toBe('Shop giúp gì được?');
        expect(document.documentElement.style.getPropertyValue('--widget-color')).toBe('#c2410c');
        stop();
    });
});
