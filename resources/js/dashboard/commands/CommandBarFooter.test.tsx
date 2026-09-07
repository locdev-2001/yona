import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setLocale } from '../../i18n';
import CommandBarFooter from './CommandBarFooter';

// Locale mặc định của bundle là `en`; sản phẩm chạy tiếng Việt nên assert theo vi.
beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

describe('CommandBarFooter', () => {
    it('vẽ gợi ý phím bằng tiếng Việt và cắm vào slot footer của ninja-keys', () => {
        const { container } = render(<CommandBarFooter hasNoMatches={false} />);

        const footer = container.querySelector('.command-bar-footer');
        expect(footer).toHaveAttribute('slot', 'footer');
        expect(screen.getByText('để chọn')).toBeInTheDocument();
        expect(screen.getByText('để di chuyển')).toBeInTheDocument();
        expect(screen.getByText('để đóng')).toBeInTheDocument();
        expect(screen.getByText('quay lại nhóm trên')).toBeInTheDocument();
        expect(screen.getByText('esc')).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/to select|to navigate|move to parent/);
    });

    it('thay gợi ý bằng thông báo không có kết quả khi bảng lệnh không khớp gì', () => {
        const { container } = render(<CommandBarFooter hasNoMatches />);

        expect(screen.getByText('Không tìm thấy kết quả nào')).toBeInTheDocument();
        expect(container.querySelector('.command-bar-footer__hint')).toBeNull();
    });
});
