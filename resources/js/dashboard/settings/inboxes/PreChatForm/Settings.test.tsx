import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as apiClient from 'dashboard/helper/apiClient';
import { setLocale, t } from '../../../../i18n';
import PreChatFormSettings from './Settings';
import type { Inbox } from '../types';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
    router: { on: () => () => undefined },
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

// Server cấp chữ mặc định theo ngôn ngữ account, độc lập với giao diện người sửa.
const DEFAULTS_EN = {
    pre_chat_message: 'Leave a few details so we can help you faster.',
    pre_chat_fields: [
        { name: 'emailAddress', label: 'Email', placeholder: 'Please enter your email address' },
        { name: 'fullName', label: 'Full name', placeholder: 'Please enter your full name' },
        { name: 'phoneNumber', label: 'Phone number', placeholder: 'Please enter your phone number' },
    ],
};

const DEFAULTS_VI = {
    pre_chat_message: 'Bạn để lại vài thông tin để chúng tôi hỗ trợ nhanh hơn nhé.',
    pre_chat_fields: [
        { name: 'emailAddress', label: 'Email', placeholder: 'Vui lòng nhập email' },
        { name: 'fullName', label: 'Tên đầy đủ', placeholder: 'Vui lòng nhập tên đầy đủ của bạn' },
        { name: 'phoneNumber', label: 'Số điện thoại', placeholder: 'Vui lòng nhập số điện thoại của bạn' },
    ],
};

const renderSettings = (defaults: unknown = DEFAULTS_VI, onInboxUpdated: (inbox: Inbox) => void = () => undefined) =>
    render(
        <PreChatFormSettings
            inbox={
                {
                    id: 85,
                    channel_type: 'Channel::WebWidget',
                    pre_chat_form_enabled: true,
                    pre_chat_form_options: LEGACY_OPTIONS,
                    pre_chat_form_defaults: defaults,
                } as unknown as Inbox
            }
            uiSettings={{}}
            onInboxUpdated={onInboxUpdated}
        />,
    );

describe('PreChatFormSettings', () => {
    beforeEach(() => setLocale('vi'));
    afterEach(() => setLocale('en'));

    it('hiện nhãn theo ngôn ngữ account (vi) cho trường chuẩn còn giữ nhãn tiếng Anh cũ', () => {
        renderSettings();

        expect(screen.getByDisplayValue('Email')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Tên đầy đủ')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Số điện thoại')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Email Id')).not.toBeInTheDocument();
    });

    it('account en + giao diện vi: hiện và lưu chữ tiếng Anh, không dịch theo giao diện', async () => {
        const patchJson = vi.spyOn(apiClient, 'patchJson').mockResolvedValue({} as Inbox);
        renderSettings(DEFAULTS_EN);

        expect(screen.getByDisplayValue('Full name')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Tên đầy đủ')).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        const body = patchJson.mock.calls[0][1] as {
            channel: { pre_chat_form_options: { pre_chat_message: string; pre_chat_fields: { label: string; placeholder: string }[] } };
        };
        const saved = body.channel.pre_chat_form_options;
        expect(saved.pre_chat_message).toBe(DEFAULTS_EN.pre_chat_message);
        expect(saved.pre_chat_fields.map(field => [field.label, field.placeholder])).toEqual(
            DEFAULTS_EN.pre_chat_fields.map(field => [field.label, field.placeholder]),
        );
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
