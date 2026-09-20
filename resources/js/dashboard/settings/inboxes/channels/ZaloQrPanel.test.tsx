import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
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

// Locale mặc định của bundle là `en`; sản phẩm chạy tiếng Việt nên assert theo vi.
beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

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

    it('báo lỗi trung lập khi không kết nối được bridge (bridge_unreachable)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.endsWith('/zalo/qr')) {
                    return Promise.resolve(jsonResponse({ ok: false, error_code: 'bridge_unreachable' }, 503));
                }
                return Promise.resolve(jsonResponse({ ok: true }));
            }),
        );

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={vi.fn()} />);

        await waitFor(() => expect(screen.getByText(/Kết nối Zalo đang tạm gián đoạn/)).toBeInTheDocument());
        // Không được lộ tên thư mục/dịch vụ cho người dùng cuối.
        expect(screen.queryByText(/zalo-bridge/)).not.toBeInTheDocument();
    });

    it('báo lỗi trung lập khi bridge/Zalo từ chối yêu cầu, không ghép thông điệp kỹ thuật (bridge_rejected)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.endsWith('/zalo/qr')) {
                    return Promise.resolve(
                        jsonResponse({ ok: false, error_code: 'bridge_rejected', bridge_message: 'invalid session' }, 422),
                    );
                }
                return Promise.resolve(jsonResponse({ ok: true }));
            }),
        );

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={vi.fn()} />);

        await waitFor(() => expect(screen.getByText(/chưa xử lý được yêu cầu/)).toBeInTheDocument());
        expect(screen.queryByText(/invalid session/)).not.toBeInTheDocument();
    });

    it('QR hết hạn tự làm mới bằng cách gọi lại POST /qr', async () => {
        let qrCallCount = 0;
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.endsWith('/zalo/qr')) {
                    qrCallCount += 1;
                    return Promise.resolve(jsonResponse({ ok: true }));
                }
                if (url.endsWith('/zalo/qr_status')) {
                    return Promise.resolve(jsonResponse({ phase: 'qr_waiting', qr_image: 'data:image/png;base64,AAA' }));
                }
                return Promise.resolve(jsonResponse({ ok: true }));
            }),
        );

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={vi.fn()} />);

        // Đếm ngược 100 giây (QR_TTL_SECONDS) hết hạn mà chưa được quét → tự xin mã mới.
        await vi.advanceTimersByTimeAsync(100_000);

        expect(qrCallCount).toBeGreaterThanOrEqual(2);
        await waitFor(() => expect(screen.getByText(/Đang tạo mã QR|Generating the QR code/)).toBeInTheDocument());
    });

    it('báo tên hộp thư khác khi tài khoản Zalo đã gắn nơi khác (zalo_account_in_use)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.endsWith('/zalo/qr')) return Promise.resolve(jsonResponse({ ok: true }));
                if (url.endsWith('/zalo/qr_status')) return Promise.resolve(jsonResponse({ phase: 'ready' }));
                if (url.endsWith('/zalo/promote')) {
                    return Promise.resolve(
                        jsonResponse({ ok: false, error_code: 'zalo_account_in_use', inbox_name: 'Zalo Cửa Hàng A' }, 409),
                    );
                }
                return Promise.resolve(jsonResponse({ ok: true }));
            }),
        );

        render(<ZaloQrPanel accountId={1} inboxId={7} onConnected={vi.fn()} />);

        await vi.advanceTimersByTimeAsync(2100);

        await waitFor(() => expect(screen.getByText(/Zalo Cửa Hàng A/)).toBeInTheDocument());
    });

    it('hiện gợi ý tài khoản đã gắn khi có boundAccountName', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) => {
                if (url.endsWith('/zalo/qr')) return Promise.resolve(jsonResponse({ ok: true }));
                return Promise.resolve(jsonResponse({ phase: 'qr_waiting' }));
            }),
        );

        render(
            <ZaloQrPanel accountId={1} inboxId={7} boundAccountName="Cửa Hàng ABC" onConnected={vi.fn()} />,
        );

        await waitFor(() => expect(screen.getByText(/Cửa Hàng ABC/)).toBeInTheDocument());
    });
});
