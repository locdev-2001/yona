import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMessageHost, type StructuredMessage } from 'shared/messaging';
import type { CardItem } from 'shared/messaging/model';

const apiMock = vi.hoisted(() => ({ sendStructuredMessage: vi.fn(), fetchFlowUrl: vi.fn(), updateMessage: vi.fn() }));
vi.mock('../api/widget', async importOriginal => ({ ...(await importOriginal<object>()), ...apiMock }));

const { default: WidgetMessageHost } = await import('./WidgetMessageHost');
const { default: VariantSheet } = await import('./VariantSheet');
const { default: WebviewSheet } = await import('./WebviewSheet');

const vase: CardItem = {
    id: 'binh-lam',
    title: 'Bình men lam',
    price: { amount: 450000, currency: 'VND' },
    max_quantity: 2,
    media_url: '/lam.jpg',
    variants: [
        { name: 'Màu', options: [{ value: 'lam', label: 'Lam', media_url: '/lam.jpg' }, { value: 'nga', label: 'Ngà', media_url: '/nga.jpg' }] },
        { name: 'Cỡ', options: [{ value: '20', label: '20cm', disabled: true }, { value: '30', label: '30cm' }] },
    ],
    actions: [{ kind: 'order', label: 'Đặt mua' }, { kind: 'link', label: 'Xem', url: 'https://gommoc.vn/binh' }],
};

const cardMessage: StructuredMessage = { id: 31, message_type: 1, content_type: 'cards', content_attributes: { items: [vase] } };

afterEach(() => vi.clearAllMocks());

describe('VariantSheet', () => {
    it('chọn sẵn lựa chọn còn hàng; cỡ hết hàng bị tắt; số lượng dừng ở mức tối đa; tạm tính theo số lượng', async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<VariantSheet item={vase} onClose={() => undefined} onSubmit={onSubmit} />);

        expect(screen.getByRole('button', { name: '20cm, sold out' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('button', { name: '30cm' }).getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(screen.getByRole('button', { name: 'Ngà' }));
        fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
        expect(screen.getByRole('button', { name: 'Increase' })).toHaveProperty('disabled', true);
        expect(screen.getByText('900.000đ')).toBeTruthy();

        fireEvent.change(screen.getByPlaceholderText('E.g. please gift-wrap it'), { target: { value: ' gói quà ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send order request' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ selections: { Màu: 'nga', Cỡ: '30' }, quantity: 2, note: 'gói quà' }));
        expect(screen.getByRole('link', { name: /View on the shop/ }).getAttribute('href')).toBe('https://gommoc.vn/binh');
    });
});

function OrderButton({ message }: { message: StructuredMessage }) {
    const host = useMessageHost();

    return (
        <>
            <button type="button" onClick={() => host.act({ kind: 'order', label: 'Đặt mua' }, { message, itemId: 'binh-lam' })}>
                đặt
            </button>
            <button type="button" onClick={() => host.act({ kind: 'webview', label: 'Chọn lịch', page: 'schedule' }, { message })}>
                lịch
            </button>
        </>
    );
}

describe('WidgetMessageHost', () => {
    it('đặt mua: gửi order_request kèm tin gốc + mã thẻ, đóng sheet khi xong', async () => {
        apiMock.sendStructuredMessage.mockResolvedValue({ id: 32, message_type: 0, content_type: 'order_request', created_at: 1 });
        render(
            <WidgetMessageHost>
                <OrderButton message={cardMessage} />
            </WidgetMessageHost>,
        );

        fireEvent.click(screen.getByText('đặt'));
        fireEvent.click(screen.getByRole('button', { name: 'Send order request' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(apiMock.sendStructuredMessage).toHaveBeenCalledWith('order_request', {
            source_message_id: 31,
            item_id: 'binh-lam',
            selections: { Màu: 'lam', Cỡ: '30' },
            quantity: 1,
            note: undefined,
        });
    });

    it('máy chủ từ chối thì sheet giữ nguyên để khách gửi lại', async () => {
        apiMock.sendStructuredMessage.mockRejectedValue(new Error('422'));
        render(
            <WidgetMessageHost>
                <OrderButton message={cardMessage} />
            </WidgetMessageHost>,
        );

        fireEvent.click(screen.getByText('đặt'));
        fireEvent.click(screen.getByRole('button', { name: 'Send order request' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Send order request' })).toHaveProperty('disabled', false));
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('trang công khai: xin link có hạn rồi mở trong sheet', async () => {
        apiMock.fetchFlowUrl.mockResolvedValue({ url: 'http://localhost:3000/m/abc' });
        render(
            <WidgetMessageHost>
                <OrderButton message={cardMessage} />
            </WidgetMessageHost>,
        );

        fireEvent.click(screen.getByText('lịch'));

        expect(await screen.findByTitle('Chọn lịch')).toHaveProperty('src', 'http://localhost:3000/m/abc');
        expect(apiMock.fetchFlowUrl).toHaveBeenCalledWith(31, 'schedule', undefined);
    });
});

describe('WebviewSheet', () => {
    it('chỉ nghe tin yona-flow từ chính origin; tin lạ bị bỏ qua', () => {
        const onSubmitted = vi.fn();
        const onClose = vi.fn();
        render(<WebviewSheet title="Chọn lịch" url="/m/abc" onClose={onClose} onSubmitted={onSubmitted} />);

        const post = (data: unknown, origin: string) => act(() => void window.dispatchEvent(new MessageEvent('message', { data, origin })));
        post({ type: 'yona-flow:submitted' }, 'https://shop-la.vn');
        post({ type: 'khac' }, window.location.origin);
        expect(onSubmitted).not.toHaveBeenCalled();

        post({ type: 'yona-flow:submitted', message_id: 31 }, window.location.origin);
        post({ type: 'yona-flow:close' }, window.location.origin);
        expect(onSubmitted).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
