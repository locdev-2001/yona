import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import PreChatFormSettings from './Settings';
import type { Inbox } from '../types';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
}));

// Dữ liệu mặc định mà hộp thư tạo trước đây đã lưu: nhãn tiếng Anh, mọi trường đều tắt.
const LEGACY_OPTIONS = {
    pre_chat_message: 'Share your queries or comments here.',
    pre_chat_fields: [
        { field_type: 'standard', label: 'Email Id', name: 'emailAddress', type: 'email', required: true, enabled: false },
        { field_type: 'standard', label: 'Full name', name: 'fullName', type: 'text', required: false, enabled: false },
        { field_type: 'standard', label: 'Phone number', name: 'phoneNumber', type: 'text', required: false, enabled: false },
    ],
};

const renderSettings = () =>
    render(
        <PreChatFormSettings
            inbox={
                {
                    id: 85,
                    channel_type: 'Channel::WebWidget',
                    pre_chat_form_enabled: true,
                    pre_chat_form_options: LEGACY_OPTIONS,
                } as unknown as Inbox
            }
            uiSettings={{}}
            onInboxUpdated={() => undefined}
        />,
    );

describe('PreChatFormSettings', () => {
    beforeEach(() => setLocale('vi'));
    afterEach(() => setLocale('en'));

    it('hiện nhãn tiếng Việt cho trường chuẩn còn giữ nhãn tiếng Anh cũ', () => {
        renderSettings();

        expect(screen.getByDisplayValue('Email')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Tên đầy đủ')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Số điện thoại')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Email Id')).not.toBeInTheDocument();
    });

    it('không hiện cột kỹ thuật Khóa và Kiểu', () => {
        renderSettings();

        expect(screen.queryByText('Khóa')).not.toBeInTheDocument();
        expect(screen.queryByText('Kiểu')).not.toBeInTheDocument();
        expect(screen.queryByText('emailAddress')).not.toBeInTheDocument();
    });

    it('cảnh báo khi biểu mẫu bật mà chưa có ô nào, hết cảnh báo khi bật một ô', () => {
        renderSettings();

        expect(screen.getByRole('status')).toHaveTextContent('chưa có ô nào được bật');

        fireEvent.click(screen.getByRole('switch', { name: 'Tên đầy đủ' }));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
