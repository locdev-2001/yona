import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { installDomStubs } from './__fixtures__/dom';
import { superAdminProps } from './__fixtures__/superAdmin';

const visit = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    router: { visit: (...args: unknown[]) => visit(...args) },
    usePage: () => ({ props: pageProps, url: '/admin' }),
}));

import CommandPalette, { SEARCH_DEBOUNCE_MS } from './CommandPalette';

function jsonResponse(status: number, body: unknown) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

async function typeQuery(value: string) {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } });
    await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 10);
    });
}

describe('CommandPalette', () => {
    const fetchMock = vi.fn();
    const onOpenChange = vi.fn();

    beforeEach(() => {
        installDomStubs();
        vi.useFakeTimers();
        visit.mockReset();
        onOpenChange.mockReset();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        pageProps = { superAdmin: superAdminProps() };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('liệt kê mọi trang khi chưa gõ, lọc không dấu khi gõ', async () => {
        fetchMock.mockReturnValue(jsonResponse(200, { data: [] }));
        render(<CommandPalette open onOpenChange={onOpenChange} />);

        expect(screen.getByRole('option', { name: /Bảng điều khiển/ })).toBeInTheDocument();

        await typeQuery('suc khoe');

        expect(screen.getByRole('option', { name: /Sức khoẻ kênh/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Bảng điều khiển/ })).not.toBeInTheDocument();
    });

    it('mũi tên + Enter mở trang đang chọn', async () => {
        render(<CommandPalette open onOpenChange={onOpenChange} />);
        const input = screen.getByRole('combobox');

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getByRole('option', { name: /^Tài khoản/ })).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(visit).toHaveBeenCalledWith('/admin/accounts');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('tìm trên máy chủ sau khi ngừng gõ và hiện kết quả theo loại', async () => {
        fetchMock.mockReturnValue(
            jsonResponse(200, {
                data: [{ type: 'account', id: 7, title: 'Shop Hoa', subtitle: '#7 · 3 hộp thư', url: '/admin/accounts/7' }],
            }),
        );
        render(<CommandPalette open onOpenChange={onOpenChange} />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sh' } });
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'shop' } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 10);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe('/admin/api/search?q=shop');

        const option = screen.getByRole('option', { name: /Shop Hoa/ });
        expect(option).toHaveTextContent('Tài khoản');
        fireEvent.click(option);

        expect(visit).toHaveBeenCalledWith('/admin/accounts/7');
    });

    it('endpoint tìm kiếm chưa có (404) thì lặng lẽ chỉ tìm trang, không báo lỗi', async () => {
        fetchMock.mockReturnValue(jsonResponse(404, {}));
        render(<CommandPalette open onOpenChange={onOpenChange} />);

        await typeQuery('khach');

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Tài khoản/ })).toBeInTheDocument();

        await typeQuery('khach hang');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('lỗi máy chủ thì báo lỗi, không có gì khớp thì báo rỗng', async () => {
        fetchMock.mockReturnValue(jsonResponse(500, {}));
        render(<CommandPalette open onOpenChange={onOpenChange} />);

        await typeQuery('zzzz');
        expect(screen.getByRole('alert')).toHaveTextContent('Không tìm được lúc này.');

        fetchMock.mockReturnValue(jsonResponse(200, { data: [] }));
        await typeQuery('qqqq');
        expect(screen.getByText('Không có kết quả cho “qqqq”.')).toBeInTheDocument();
    });

    it('mục công cụ bên ngoài mở tab mới thay vì điều hướng trong console', async () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        fetchMock.mockReturnValue(jsonResponse(200, { data: [] }));
        render(<CommandPalette open onOpenChange={onOpenChange} />);

        await typeQuery('horizon');
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

        expect(open).toHaveBeenCalledWith('/horizon', '_blank', 'noopener,noreferrer');
        expect(visit).not.toHaveBeenCalled();
    });
});
