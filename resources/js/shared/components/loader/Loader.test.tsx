import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { t } from '../../../i18n';
import Loader from './Loader';
import LoaderIcon from './LoaderIcon';

describe('Loader', () => {
    it('báo trạng thái đang tải cho trình đọc màn hình', () => {
        render(<Loader />);

        expect(t('COMPONENTS.LOADER.LABEL')).not.toBe('COMPONENTS.LOADER.LABEL');
        expect(screen.getByRole('status', { name: t('COMPONENTS.LOADER.LABEL') })).toBeInTheDocument();
    });

    it.each([
        [undefined, '24px'],
        [16, '16px'],
        [32, '32px'],
    ])('size=%s đặt bề ngang hiệu ứng %s', (size, expectedWidth) => {
        render(<Loader size={size} />);

        const bouncy = screen.getByRole('status').firstElementChild as HTMLElement;
        expect(bouncy.style.getPropertyValue('--uib-size')).toBe(expectedWidth);
    });

    it('lấy màu theo chữ xung quanh và giữ class của nơi gọi', () => {
        render(<Loader className="text-n-brand" />);

        const status = screen.getByRole('status');
        expect(status).toHaveClass('yona-loader', 'text-n-brand');
        expect((status.firstElementChild as HTMLElement).style.getPropertyValue('--uib-color')).toBe('currentColor');
    });
});

describe('LoaderIcon', () => {
    it('không có nhãn thì chỉ trang trí, không thành vùng trạng thái thứ hai', () => {
        const { container } = render(<LoaderIcon size={16} />);

        expect(screen.queryByRole('status')).toBeNull();
        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('có nhãn thì là vùng trạng thái mang đúng nhãn đó', () => {
        render(<LoaderIcon label="Đang tìm…" />);

        expect(screen.getByRole('status', { name: 'Đang tìm…' })).toBeInTheDocument();
    });
});
