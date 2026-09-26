import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../i18n';
import { FLOW_PAGES } from './registry';
import type { FlowResponse } from './types';

// Mỗi trang render từ một fixture FlowResponse — khớp payload thật của
// `GET /public/api/v1/flows/{token}` (PublicFlowService::describe()).
const flowOf = (purpose: FlowResponse['purpose'], data: Record<string, unknown>, extra: Partial<FlowResponse> = {}): FlowResponse => ({
    purpose,
    org_name: 'Gốm Mộc',
    message_id: 1,
    title: 'Tiêu đề',
    data,
    ...extra,
});

const mockFetchOk = (body: Record<string, unknown> = { ok: true }) => {
    const calls: { url: string; body: unknown }[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });

        return new Response(JSON.stringify(body));
    });

    return calls;
};

beforeEach(() => setLocale('vi'));
afterEach(() => vi.restoreAllMocks());

describe('trang schedule', () => {
    const flow = flowOf('schedule', {
        note: 'Đơn #GM1024, giao tới 12 Hàng Bông, Hoàn Kiếm',
        slots: [
            { date: '2026-09-26', label: '8:00 đến 10:00', value: 't6-am' },
            { date: '2026-09-27', label: '8:00 đến 10:00', value: 't7-am' },
            { date: '2026-09-27', label: '16:00 đến 18:00', value: 't7-pm', full: true },
        ],
    });

    it('chọn ngày rồi khung giờ mới bật được nút xác nhận, khung hết chỗ bị tắt', async () => {
        const Page = FLOW_PAGES.schedule;
        mockFetchOk();
        const onSubmitted = vi.fn();

        render(<Page flow={flow} token="tok" onSubmitted={onSubmitted} />);

        expect(screen.getByRole('button', { name: 'Chọn một khung giờ' })).toBeDisabled();

        fireEvent.click(screen.getByText('27'));
        expect(screen.getByRole('button', { name: '16:00 đến 18:00' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: '8:00 đến 10:00' }));
        const confirm = screen.getByRole('button', { name: /Xác nhận/ });
        expect(confirm).not.toBeDisabled();

        await act(async () => fireEvent.click(confirm));

        expect(onSubmitted).toHaveBeenCalledTimes(1);
    });
});

describe('trang form', () => {
    const flow = flowOf('form', {
        items: [
            { name: 'address', type: 'text', label: 'Địa chỉ', required: true },
            { name: 'note', type: 'text_area', label: 'Ghi chú' },
        ],
    });

    it('gửi đúng submitted_values của các ô đã điền', async () => {
        const Page = FLOW_PAGES.form;
        const calls = mockFetchOk();
        const onSubmitted = vi.fn();

        render(<Page flow={flow} token="tok" onSubmitted={onSubmitted} />);

        fireEvent.change(screen.getByLabelText('Địa chỉ'), { target: { value: '12 Hàng Bông' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Gửi thông tin' })));

        expect(onSubmitted).toHaveBeenCalledTimes(1);
        expect(calls[0].body).toStrictEqual({ submitted_values: [{ name: 'address', value: '12 Hàng Bông' }] });
    });
});

describe('trang order_tracking', () => {
    it('vẽ mã đơn, trạng thái và tổng tiền, không có nút gửi', () => {
        const Page = FLOW_PAGES.order_tracking;
        const flow = flowOf('order_tracking', { order_ref: 'GM1024', status: 'delivering', total: { amount: 480000, currency: 'VND' } });

        render(<Page flow={flow} token="tok" onSubmitted={vi.fn()} />);

        expect(screen.getByText('Đơn #GM1024')).toBeInTheDocument();
        expect(screen.getByText('Đang giao')).toBeInTheDocument();
        expect(screen.getByText('480.000đ')).toBeInTheDocument();
    });
});

describe('trang bank_transfer', () => {
    it('chép được số tài khoản vào clipboard', async () => {
        const Page = FLOW_PAGES.bank_transfer;
        const flow = flowOf('bank_transfer', { bank_name: 'Vietcombank', account_number: '0123456789' });
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

        render(<Page flow={flow} token="tok" onSubmitted={vi.fn()} />);

        await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Chép' })[0]));

        expect(writeText).toHaveBeenCalledWith('Vietcombank');
    });
});

describe('trang product', () => {
    const flow = flowOf(
        'product',
        {
            id: 'binh-lam-40',
            title: 'Bình men lam 40cm',
            price: { amount: 1250000, currency: 'VND' },
            max_quantity: 2,
            variants: [{ name: 'Màu', options: [{ value: 'lam', label: 'Lam' }, { value: 'ngoc', label: 'Ngọc', disabled: true }] }],
        },
        { source_message_id: 9 },
    );

    it('phải chọn đủ biến thể mới gửi được, giá tạm tính nhân theo số lượng', async () => {
        const Page = FLOW_PAGES.product;
        const calls = mockFetchOk();
        const onSubmitted = vi.fn();

        render(<Page flow={flow} token="tok" onSubmitted={onSubmitted} />);

        expect(screen.getByRole('button', { name: 'Gửi yêu cầu đặt hàng' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Ngọc' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Lam' }));
        fireEvent.click(screen.getByRole('button', { name: '+' }));
        expect(screen.getByText('2.500.000đ')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đặt hàng' })));

        expect(onSubmitted).toHaveBeenCalledTimes(1);
        expect(calls[0].body).toStrictEqual({ selections: [{ name: 'Màu', value: 'lam' }], quantity: 2 });
    });
});
