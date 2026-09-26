import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../../i18n';
import PreviewPane from './PreviewPane';
import { DEFAULT_WIDGET_SETTINGS } from '../draft';

function stubIframeContentWindow(container: HTMLElement) {
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const postMessage = vi.fn();
    Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, configurable: true });

    return postMessage;
}

function sendReadyMessage() {
    fireEvent(window, new MessageEvent('message', { origin: window.location.origin, data: { type: 'yona-preview:ready' } }));
}

describe('PreviewPane — khung xem trước bằng chính widget thật', () => {
    beforeEach(() => {
        setLocale('vi');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        setLocale('en');
    });

    it('gửi yona-preview:config ngay khi khung báo sẵn sàng', () => {
        const { container } = render(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#1B6FCC"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );
        const postMessage = stubIframeContentWindow(container);

        sendReadyMessage();
        vi.advanceTimersByTime(200);

        expect(postMessage).toHaveBeenCalledWith(
            {
                type: 'yona-preview:config',
                config: {
                    widgetColor: '#1B6FCC',
                    websiteName: 'Gốm Mộc',
                    welcomeTagline: 'Xin chào',
                    widgetSettings: DEFAULT_WIDGET_SETTINGS,
                },
            },
            window.location.origin,
        );
    });

    it('sửa một ô thì gửi lại cấu hình mới sang khung xem trước', () => {
        const { container, rerender } = render(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#1B6FCC"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );
        const postMessage = stubIframeContentWindow(container);
        sendReadyMessage();
        vi.advanceTimersByTime(200);
        postMessage.mockClear();

        rerender(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#EA580C"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );
        vi.advanceTimersByTime(200);

        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'yona-preview:config', config: expect.objectContaining({ widgetColor: '#EA580C' }) }),
            window.location.origin,
        );
    });

    it('chưa nhận ready thì không gửi cấu hình', () => {
        const { container } = render(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#1B6FCC"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );
        const postMessage = stubIframeContentWindow(container);

        vi.advanceTimersByTime(500);

        expect(postMessage).not.toHaveBeenCalled();
    });

    it('bỏ qua message từ origin lạ', () => {
        const { container } = render(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#1B6FCC"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );
        const postMessage = stubIframeContentWindow(container);

        fireEvent(window, new MessageEvent('message', { origin: 'https://evil.example', data: { type: 'yona-preview:ready' } }));
        vi.advanceTimersByTime(500);

        expect(postMessage).not.toHaveBeenCalled();
    });

    it('bấm "Điện thoại" đổi kích thước khung xem trước', () => {
        render(
            <PreviewPane
                websiteToken="gm_token"
                websiteName="Gốm Mộc"
                widgetColor="#1B6FCC"
                welcomeTagline="Xin chào"
                widgetSettings={DEFAULT_WIDGET_SETTINGS}
            />,
        );

        const iframe = document.querySelector('iframe') as HTMLIFrameElement;
        expect(iframe.style.width).toBe('380px');

        fireEvent.click(screen.getByRole('radio', { name: 'Điện thoại' }));

        expect(iframe.style.width).toBe('320px');
    });
});
