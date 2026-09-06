import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ZaloQrPanel from './ZaloQrPanel';

// Vòng đời QR: mở phiên → hỏi trạng thái tới khi bridge báo đã quét → chốt phiên.
function jsonResponse(body: unknown, status = 200): Response {
    return {
        ok: status < 400,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response;
}

describe('ZaloQrPanel', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('hiện ảnh QR rồi chốt phiên khi bridge báo đã quét', async () => {
        const statuses = [
            { phase: 'qr_waiting', qr_image: 'data:image/png;base64,AAA' },
            { phase: 'ready' },
        ];
        const onConnected = vi.fn();

        const fetchMock = vi.fn((url: string) => {
            if (url.endsWith('/zalo/qr')) return Promise.resolve(jsonResponse({ ok: true }));
            if (url.endsWith('/zalo/qr_status')) return Promise.resolve(jsonResponse(statuses.shift()));
            return Promise.resolve(jsonResponse({ ok: true }));
        });
        vi.stubGlobal('fetch', fetchMock);

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={onConnected} />);

        await vi.advanceTimersByTimeAsync(2100);
        await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,AAA'));

        await vi.advanceTimersByTimeAsync(2100);
        await waitFor(() => expect(onConnected).toHaveBeenCalled());

        expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/zalo/promote'))).toBe(true);
    });

    it('hiện nút quét lại khi bridge chưa chạy', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(jsonResponse({ ok: false, message: 'bridge chưa chạy' }, 503))),
        );

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={vi.fn()} />);

        await waitFor(() => expect(screen.getByText('bridge chưa chạy')).toBeInTheDocument());
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});
