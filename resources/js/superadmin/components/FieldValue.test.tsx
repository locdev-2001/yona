import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import FieldValue from './FieldValue';

// Đối chiếu với các partial field của Administrate: mỗi kiểu field vẽ đúng một
// kiểu (spec bản gốc nằm trong view test của gem nên đây là test tương đương).
const field = (type: string, value: unknown) => ({
    name: 'attr',
    label: 'Attr',
    type,
    html_class: type.replace(/_/g, '-'),
    value,
});

describe('FieldValue', () => {
    it('bọc chuỗi trong .preserve-whitespace như bản gốc', () => {
        const { container } = render(<FieldValue field={field('string', 'Acme Inc')} />);

        expect(container.querySelector('.preserve-whitespace')?.textContent).toBe('Acme Inc');
    });

    it('che token và chỉ lộ khi bấm nút hiện', async () => {
        const { container } = render(<FieldValue field={field('secret_field', 'abc123')} />);

        expect(container.textContent).not.toContain('abc123');

        (container.querySelectorAll('button')[0] as HTMLButtonElement).click();

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

        expect(screen.getByText('No suspension history recorded.')).toBeInTheDocument();
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
