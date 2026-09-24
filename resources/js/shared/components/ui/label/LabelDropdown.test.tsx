import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Label } from 'dashboard/settings/labels/types';
import { t } from '../../../../i18n';
import LabelDropdown from './LabelDropdown';

const makeLabel = (id: number, title: string): Label => ({
    id,
    title,
    description: null,
    color: '#1f93ff',
    show_on_sidebar: true,
});

const ACCOUNT_LABELS = [makeLabel(1, 'Khách VIP'), makeLabel(2, 'Đã chốt đơn'), makeLabel(3, 'Hỏi giá')];

const createRowText = (title: string) => t('CONTACT_PANEL.LABELS.LABEL_SELECT.CREATE_NAMED', { title });

// Phím tắt gắn vào document sau khi dò bố cục bàn phím; cố định bố cục để khỏi dò
// (dò bằng ô nhập tạm sẽ cướp focus) và chờ lượt gắn listener xong.
beforeAll(() => {
    window.cw_keyboard_layout = 'QWERTY';
});

async function renderDropdown(overrides: Partial<Parameters<typeof LabelDropdown>[0]> = {}) {
    const props = {
        accountLabels: ACCOUNT_LABELS,
        selectedLabels: [] as string[],
        allowCreation: true,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onCreate: vi.fn(() => Promise.resolve()),
        onCustomize: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    };
    render(<LabelDropdown {...props} />);
    await act(async () => undefined);

    return { props, searchbox: screen.getByRole('combobox') };
}

const optionTitles = () => screen.getAllByRole('option').map(option => option.textContent);

describe('LabelDropdown', () => {
    it('tự focus ô tìm khi mở', async () => {
        const { searchbox } = await renderDropdown();

        expect(document.activeElement).toBe(searchbox);
    });

    it('tìm không dấu: gõ "khach" ra "Khách VIP", gõ "da chot" ra "Đã chốt đơn"', async () => {
        const { searchbox } = await renderDropdown();

        fireEvent.change(searchbox, { target: { value: 'khach' } });
        expect(optionTitles()[0]).toBe('Khách VIP');

        fireEvent.change(searchbox, { target: { value: 'da chot' } });
        expect(optionTitles()[0]).toBe('Đã chốt đơn');
    });

    it('tạo nhanh giữ nguyên dấu, chữ hoa và khoảng trắng giữa các từ, chỉ cắt hai đầu', async () => {
        const { props, searchbox } = await renderDropdown();

        fireEvent.change(searchbox, { target: { value: '  Chờ chuyển khoản  ' } });
        expect(screen.getByText(createRowText('Chờ chuyển khoản'))).toBeInTheDocument();

        await act(async () => {
            fireEvent.keyDown(searchbox, { key: 'Enter', code: 'Enter' });
        });

        expect(props.onCreate).toHaveBeenCalledWith('Chờ chuyển khoản');
        expect(searchbox).toHaveValue('');
    });

    it('dòng tạo nhãn vẫn hiện khi còn nhãn khớp một phần, chỉ ẩn khi trùng chính xác không phân biệt hoa thường', async () => {
        const { searchbox } = await renderDropdown();

        fireEvent.change(searchbox, { target: { value: 'VIP' } });
        expect(screen.getByText(createRowText('VIP'))).toBeInTheDocument();

        fireEvent.change(searchbox, { target: { value: 'khách vip' } });
        expect(screen.queryByText(createRowText('khách vip'))).not.toBeInTheDocument();
    });

    it('bấm dòng tạo nhãn là tạo ngay; nút Tùy chỉnh mở form đầy đủ với tên đang gõ', async () => {
        const { props, searchbox } = await renderDropdown();

        fireEvent.change(searchbox, { target: { value: 'Đổi trả' } });
        fireEvent.click(screen.getByText(t('CONTACT_PANEL.LABELS.LABEL_SELECT.CUSTOMIZE')));
        expect(props.onCustomize).toHaveBeenCalledWith('Đổi trả');
        expect(props.onCreate).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(screen.getByText(createRowText('Đổi trả')));
        });
        expect(props.onCreate).toHaveBeenCalledWith('Đổi trả');
    });

    it('người không có quyền tạo không thấy dòng tạo nhãn', async () => {
        const { searchbox } = await renderDropdown({ allowCreation: false });

        fireEvent.change(searchbox, { target: { value: 'Khách mới' } });

        expect(screen.queryByText(createRowText('Khách mới'))).not.toBeInTheDocument();
    });

    it('↑/↓ đổi dòng đang chọn, Enter gắn hoặc bỏ nhãn, Esc đóng', async () => {
        const { props, searchbox } = await renderDropdown({ selectedLabels: ['Hỏi giá'] });

        fireEvent.keyDown(searchbox, { key: 'ArrowDown', code: 'ArrowDown' });
        fireEvent.keyDown(searchbox, { key: 'Enter', code: 'Enter' });
        expect(props.onAdd).toHaveBeenCalledWith(ACCOUNT_LABELS[1]);

        fireEvent.keyDown(searchbox, { key: 'ArrowDown', code: 'ArrowDown' });
        fireEvent.keyDown(searchbox, { key: 'ArrowUp', code: 'ArrowUp' });
        fireEvent.keyDown(searchbox, { key: 'Enter', code: 'Enter' });
        expect(props.onAdd).toHaveBeenCalledTimes(2);

        fireEvent.keyDown(searchbox, { key: 'ArrowUp', code: 'ArrowUp' });
        expect(screen.getAllByRole('option')[0]).toHaveAttribute('data-active', 'true');
        fireEvent.keyDown(searchbox, { key: 'ArrowUp', code: 'ArrowUp' });
        fireEvent.keyDown(searchbox, { key: 'Enter', code: 'Enter' });
        expect(props.onRemove).toHaveBeenCalledWith('Hỏi giá');

        fireEvent.keyDown(searchbox, { key: 'Escape', code: 'Escape' });
        expect(props.onClose).toHaveBeenCalled();
    });
});
