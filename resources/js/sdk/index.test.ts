import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    LEGACY_EVENT_PREFIX,
    LEGACY_INSTANCE_GLOBAL,
    LEGACY_SDK_GLOBAL,
    LEGACY_SETTINGS_GLOBAL,
} from '../shared/legacyContracts';
import { APP_FRAME_ID } from './constants/frameEvents';

const globals = () => window as unknown as Record<string, unknown>;

const loadSdk = async () => {
    vi.resetModules();
    await import('./index');
};

const run = () => window.yonaSDK.run({ baseUrl: 'https://app.yona.vn', websiteToken: 'website-token' });

beforeEach(() => {
    [LEGACY_SDK_GLOBAL, LEGACY_SETTINGS_GLOBAL, LEGACY_INSTANCE_GLOBAL, '$yona', 'yonaSDK', 'yonaSettings'].forEach(
        name => delete globals()[name],
    );
});

afterEach(() => {
    document.getElementById('cw-widget-holder')?.remove();
    document.querySelectorAll('.woot--bubble-holder').forEach(holder => holder.remove());
    window.onmessage = null;
    vi.unstubAllGlobals();
});

describe('SDK nhúng', () => {
    it('nạp script là có yonaSDK.run, tên toàn cục đời trước trỏ cùng object', async () => {
        await loadSdk();

        expect(typeof window.yonaSDK.run).toBe('function');
        expect(globals()[LEGACY_SDK_GLOBAL]).toBe(window.yonaSDK);
    });

    it('run() dựng $yona và tên instance đời trước trỏ cùng object', async () => {
        await loadSdk();
        run();

        expect(window.$yona.websiteToken).toBe('website-token');
        expect(globals()[LEGACY_INSTANCE_GLOBAL]).toBe(window.$yona);
    });

    it('đọc biến settings đời trước khi trang chỉ đặt biến đó', async () => {
        globals()[LEGACY_SETTINGS_GLOBAL] = { position: 'left' };
        await loadSdk();
        run();

        expect(window.$yona.position).toBe('left');
    });

    it('trang đặt cả hai biến settings thì biến tên mới thắng', async () => {
        globals()[LEGACY_SETTINGS_GLOBAL] = { position: 'left', launcherTitle: 'Cũ' };
        window.yonaSettings = { position: 'right' };
        await loadSdk();
        run();

        expect(window.$yona.position).toBe('right');
        expect(window.$yona.launcherTitle).toBe('Cũ');
    });

    it('ngôn ngữ trang nhúng chọn (cả biến settings đời trước) đi vào URL iframe', async () => {
        globals()[LEGACY_SETTINGS_GLOBAL] = { locale: 'vi' };
        await loadSdk();
        run();

        const frameUrl = new URL((document.getElementById(APP_FRAME_ID) as HTMLIFrameElement).src);
        expect(frameUrl.searchParams.get('locale')).toBe('vi');
    });

    it('trang không chọn ngôn ngữ thì URL iframe không mang locale, máy chủ theo account', async () => {
        await loadSdk();
        run();

        const frameUrl = new URL((document.getElementById(APP_FRAME_ID) as HTMLIFrameElement).src);
        expect(frameUrl.searchParams.has('locale')).toBe(false);
    });

    it('useBrowserLanguage lấy ngôn ngữ trình duyệt cho URL iframe', async () => {
        window.yonaSettings = { useBrowserLanguage: true };
        vi.stubGlobal('navigator', { ...window.navigator, language: 'vi-VN' });
        await loadSdk();
        run();

        const frameUrl = new URL((document.getElementById(APP_FRAME_ID) as HTMLIFrameElement).src);
        expect(frameUrl.searchParams.get('locale')).toBe('vi_VN');
    });

    it('gọi run() lần hai không dựng iframe thứ hai', async () => {
        await loadSdk();
        run();
        run();

        expect(document.querySelectorAll(`#${APP_FRAME_ID}`)).toHaveLength(1);
    });

    it('widget nạp xong thì trang nghe tên mới lẫn tên cũ đều nhận sự kiện ready', async () => {
        const received: string[] = [];
        ['yona:ready', `${LEGACY_EVENT_PREFIX}:ready`].forEach(name =>
            window.addEventListener(name, () => received.push(name), { once: true }),
        );
        vi.stubGlobal('matchMedia', () => ({ matches: false }));
        await loadSdk();
        run();
        const { IFrameHelper } = await import('./IFrameHelper');

        IFrameHelper.events.loaded({ config: { authToken: 'visitor-token', channelConfig: { widgetColor: '#1f93ff' } } });

        expect(received).toEqual(['yona:ready', `${LEGACY_EVENT_PREFIX}:ready`]);
    });
});
