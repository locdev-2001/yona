import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import SenderNameSection from './SenderNameSection';

const renderSection = (overrides: Partial<Parameters<typeof SenderNameSection>[0]> = {}) => {
    const props = {
        senderNameType: 'friendly',
        businessName: '',
        inboxName: 'Shop Hoa Mai',
        agentName: 'Chị Hà',
        emailAddress: 'hotro@shophoamai.vn',
        isSavingBusinessName: false,
        onSenderNameTypeChange: vi.fn(),
        onBusinessNameChange: vi.fn(),
        onSaveBusinessName: vi.fn().mockResolvedValue(true),
        ...overrides,
    };
    render(<SenderNameSection {...props} />);

    return props;
};

describe('SenderNameSection', () => {
    beforeEach(() => setLocale('vi'));

    it('dựng ví dụ từ tên nhân viên, tên hộp thư và địa chỉ gửi thật', () => {
        renderSection();

        expect(screen.getByText('Chị Hà')).toBeInTheDocument();
        expect(screen.getAllByText('Shop Hoa Mai')).toHaveLength(2);
        expect(screen.getAllByText('<hotro@shophoamai.vn>')).toHaveLength(2);
        expect(document.body.textContent).not.toMatch(/Smith|yourbusiness/);
    });

    it('ưu tiên tên doanh nghiệp đã đặt thay cho tên hộp thư', () => {
        renderSection({ businessName: 'Hoa Mai Florist' });

        expect(screen.getAllByText('Hoa Mai Florist')).toHaveLength(2);
        expect(screen.queryByText('Shop Hoa Mai')).not.toBeInTheDocument();
    });

    it('nút Lưu chỉ gọi lưu tên doanh nghiệp rồi đóng ô nhập', async () => {
        const props = renderSection({ businessName: 'Hoa Mai Florist' });

        fireEvent.click(screen.getByRole('button', { name: 'Đặt tên doanh nghiệp của bạn' }));
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        await waitFor(() => expect(props.onSaveBusinessName).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument());
        expect(props.onSenderNameTypeChange).not.toHaveBeenCalled();
    });

    it('giữ ô nhập mở khi lưu lỗi', async () => {
        renderSection({ onSaveBusinessName: vi.fn().mockResolvedValue(false) });

        fireEvent.click(screen.getByRole('button', { name: 'Đặt tên doanh nghiệp của bạn' }));
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument());
    });
});
