import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const visit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({
    router: { visit },
    usePage: () => ({ props: { currentAccount: { id: 3 }, currentAccountUser: { role: 'administrator' } } }),
}));
vi.mock('dashboard/components-next/button/Button', () => ({
    default: ({ label, icon, children, onClick, id }: { label?: string; icon?: string; children?: ReactNode; onClick?: () => void; id?: string }) => (
        <button id={id} aria-label={label || icon} onClick={onClick}>{children}</button>
    ),
}));
vi.mock('./components/ContactSortMenu', () => ({ default: () => null }));

import ContactHeader from './ContactHeader';

describe('Danh sách khách tinh gọn', () => {
    it('ẩn lưu phân khúc nhưng giữ lọc, tìm kiếm và nhập/xuất CSV', () => {
        const onFilter = vi.fn();
        const onImport = vi.fn();
        const onExport = vi.fn();
        render(<ContactHeader headerTitle="Khách hàng" hasActiveFilters onSearch={vi.fn()} onUpdateSort={vi.fn()} onAdd={vi.fn()} onImport={onImport} onExport={onExport} onFilter={onFilter} onCreateSegment={vi.fn()} />);
        expect(screen.getByRole('searchbox')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'i-lucide-save' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'i-lucide-list-filter' }));
        expect(onFilter).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'i-lucide-ellipsis-vertical' }));
        fireEvent.click(screen.getByText(/Export contacts|Xuất liên hệ/));
        expect(onExport).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByText(/Import contacts|Nhập liên hệ/));
        expect(onImport).toHaveBeenCalledOnce();
    });

    it('nút soạn tin mở bản nháp hội thoại trong Inbox', () => {
        render(<ContactHeader headerTitle="Khách hàng" buttonLabel="Tin nhắn" onSearch={vi.fn()} onUpdateSort={vi.fn()} onAdd={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Tin nhắn' }));
        expect(visit).toHaveBeenCalledWith('/app/accounts/3/inbox/new');
    });
});
