import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { superAdminProps } from './__fixtures__/superAdmin';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a>,
    router: { delete: vi.fn() },
    usePage: () => ({ props: { superAdmin: superAdminProps() } }),
}));

import FieldValue, { formatDateTime } from './FieldValue';

// Mỗi kiểu field vẽ đúng một kiểu.
const field = (type: string, value: unknown) => ({
    name: 'attr',
    label: 'Attr',
    type,
    html_class: type.replace(/_/g, '-'),
    value,
});

describe('FieldValue', () => {
    it('giữ xuống dòng của chuỗi', () => {
        const { container } = render(<FieldValue field={field('string', 'Acme\nInc')} />);

        expect(container.querySelector('.whitespace-pre-wrap')?.textContent).toBe('Acme\nInc');
    });

    it('trạng thái tài khoản hiện nhãn tiếng Việt', () => {
        render(<FieldValue field={field('account_status_field', 'suspended')} />);

        expect(screen.getByText('Tạm khoá')).toBeInTheDocument();
    });

    it('định dạng thời điểm máy chủ gửi, chuỗi lạ giữ nguyên', () => {
        expect(formatDateTime('Mon, 31 Aug 2026 06:58:21 +0000')).toMatch(/2026/);
        expect(formatDateTime('không phải ngày')).toBe('không phải ngày');
        expect(formatDateTime(null)).toBe('-');
    });

    it('che token và chỉ lộ khi bấm nút hiện', async () => {
        const { container } = render(<FieldValue field={field('secret_field', 'abc123')} />);

        expect(container.textContent).not.toContain('abc123');

        screen.getByRole('button', { name: 'Hiện' }).click();

        await screen.findByText('abc123');
    });

    it('vẽ liên kết cho quan hệ belongs_to', () => {
        render(<FieldValue field={field('belongs_to', { label: '#1 Acme Inc', url: '/admin/accounts/1' })} />);

        expect(screen.getByRole('link', { name: '#1 Acme Inc' })).toHaveAttribute(
            'href',
            '/admin/accounts/1',
        );
    });

    it('báo rỗng khi chưa có lịch sử đình chỉ', () => {
        render(<FieldValue field={field('suspension_history_field', [])} />);

        expect(screen.getByText('Chưa có lịch sử tạm khoá nào.')).toBeInTheDocument();
    });

    it('liệt kê lịch sử đình chỉ khi có', () => {
        render(
            <FieldValue
                field={field('suspension_history_field', [
                    { category: 'spam', reason: 'Gửi thư rác', suspended_at: '2026-09-06T00:00:00Z' },
                ])}
            />,
        );

        expect(screen.getByText(/Gửi thư rác/)).toBeInTheDocument();
    });

    it('không vẽ bảng has_many khi không có dòng nào', () => {
        const { container } = render(<FieldValue field={field('has_many', { columns: [], rows: [] })} />);

        expect(container.querySelector('table')).toBeNull();
    });
});
