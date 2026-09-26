import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Segmented from './Segmented';

const OPTIONS = [
    { value: 'round', label: 'Tròn' },
    { value: 'pill', label: 'Có chữ' },
];

describe('Segmented', () => {
    it('render radiogroup và đánh dấu đúng lựa chọn đang chọn', () => {
        render(<Segmented options={OPTIONS} value="round" onChange={() => undefined} ariaLabel="Kiểu launcher" />);

        expect(screen.getByRole('radiogroup', { name: 'Kiểu launcher' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Tròn' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: 'Có chữ' })).toHaveAttribute('aria-checked', 'false');
    });

    it('bấm một ô thì gọi onChange với giá trị của ô đó', () => {
        const onChange = vi.fn();
        render(<Segmented options={OPTIONS} value="round" onChange={onChange} />);

        fireEvent.click(screen.getByRole('radio', { name: 'Có chữ' }));

        expect(onChange).toHaveBeenCalledWith('pill');
    });

    it('mũi tên phải/trái chuyển lựa chọn theo vòng tròn và chuyển cả tiêu điểm', () => {
        const onChange = vi.fn();
        const { rerender } = render(<Segmented options={OPTIONS} value="round" onChange={onChange} />);

        fireEvent.keyDown(screen.getByRole('radio', { name: 'Tròn' }), { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith('pill');

        rerender(<Segmented options={OPTIONS} value="pill" onChange={onChange} />);
        expect(screen.getByRole('radio', { name: 'Có chữ' })).toHaveFocus();

        fireEvent.keyDown(screen.getByRole('radio', { name: 'Có chữ' }), { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith('round');
    });

    it('bỏ qua lựa chọn bị disabled khi dùng mũi tên', () => {
        const optionsWithDisabled = [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B', disabled: true },
            { value: 'c', label: 'C' },
        ];
        const onChange = vi.fn();
        render(<Segmented options={optionsWithDisabled} value="a" onChange={onChange} />);

        fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowRight' });

        expect(onChange).toHaveBeenCalledWith('c');
    });

    it('không cắt chữ trong nhãn (không dùng truncate/overflow-hidden)', () => {
        render(<Segmented options={OPTIONS} value="round" onChange={() => undefined} />);

        const radio = screen.getByRole('radio', { name: 'Có chữ' });
        expect(radio.className).not.toMatch(/truncate|overflow-hidden/);
    });
});
