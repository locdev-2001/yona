import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../../i18n';
import { ApiError } from 'dashboard/helper/apiClient';
import { DEFAULT_WIDGET_SETTINGS } from './draft';
import WidgetBuilderPage from './WidgetBuilderPage';
import type { Inbox } from '../types';

const getJson = vi.fn();
const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 3 } } }),
    router: { visit: vi.fn(), on: () => () => undefined },
    Link: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('../../../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

vi.mock('dashboard/helper/apiClient', async importOriginal => {
    const actual = await importOriginal<typeof import('dashboard/helper/apiClient')>();

    return {
        ...actual,
        getJson: (...args: unknown[]) => getJson(...args),
        patchJson: (...args: unknown[]) => patchJson(...args),
    };
});

const webWidgetInbox: Inbox = {
    id: 140,
    name: 'Website Gốm Mộc',
    channel_type: 'Channel::WebWidget',
    avatar_url: '',
    channel_id: 1,
    business_name: null,
    sender_name_type: 'friendly',
    continuity_via_email: true,
    enable_email_collect: true,
    csat_survey_enabled: false,
    csat_config: {},
    enable_auto_assignment: false,
    auto_assignment_config: {},
    out_of_office_message: null,
    allow_messages_after_resolved: true,
    greeting_enabled: false,
    greeting_message: '',
    lock_to_single_conversation: false,
    working_hours_enabled: false,
    working_hours: [],
    timezone: 'UTC',
    callback_webhook_url: null,
    website_url: 'gommoc.vn',
    welcome_title: '',
    welcome_tagline: 'Gốm Mộc có thể giúp gì?',
    widget_color: '#1B6FCC',
    selected_feature_flags: [],
    reply_time: 'in_a_few_minutes',
    web_widget_script: '<script>yonaSDK</script>',
    website_token: 'gm_token',
    allowed_domains: '',
    widget_settings: DEFAULT_WIDGET_SETTINGS,
    help_center: null,
} as unknown as Inbox;

const renderPage = async () => {
    render(<WidgetBuilderPage inboxId={140} />);
    await screen.findByText(t('WIDGET_BUILDER.HEADER.TITLE'));
};

describe('WidgetBuilderPage — màn Widget chat', () => {
    beforeEach(() => {
        setLocale('vi');
        getJson.mockReset();
        patchJson.mockReset();
        getJson.mockResolvedValue(webWidgetInbox);
    });

    it('Lưu thay đổi gửi đúng một PATCH gồm name + widget_color + welcome_tagline + widget_settings', async () => {
        patchJson.mockResolvedValue(webWidgetInbox);
        await renderPage();

        fireEvent.click(screen.getByRole('radio', { name: 'Có chữ' }));

        const saveButton = screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') });
        expect(saveButton).not.toBeDisabled();
        fireEvent.click(saveButton);

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        expect(patchJson).toHaveBeenCalledWith('/api/v1/accounts/3/inboxes/140', {
            name: 'Website Gốm Mộc',
            channel: {
                widget_color: '#1B6FCC',
                welcome_tagline: 'Gốm Mộc có thể giúp gì?',
                widget_settings: { ...DEFAULT_WIDGET_SETTINGS, appearance: { ...DEFAULT_WIDGET_SETTINGS.appearance, launcher: 'pill' } },
                allowed_domains: '',
            },
        });
    });

    it('âm báo tin mới của widget đi cùng bản nháp: đổi âm rồi tắt, Lưu gửi đúng cấu hình âm', async () => {
        patchJson.mockResolvedValue(webWidgetInbox);
        await renderPage();

        fireEvent.change(screen.getByLabelText(t('ALERT_SOUND.TONE_LABEL'), { selector: 'select' }), {
            target: { value: 'chime' },
        });
        fireEvent.click(screen.getByRole('switch', { name: t('WIDGET_BUILDER.APPEARANCE.SOUND_LABEL') }));
        expect(screen.queryByRole('button', { name: t('ALERT_SOUND.PREVIEW') })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        const [, payload] = patchJson.mock.calls[0] as [string, { channel: { widget_settings: typeof DEFAULT_WIDGET_SETTINGS } }];
        expect(payload.channel.widget_settings.notification_sound).toEqual({ enabled: false, tone: 'chime' });
    });

    it('tên miền được phép đi cùng bản nháp, không tự lưu khi vừa thêm', async () => {
        patchJson.mockResolvedValue(webWidgetInbox);
        await renderPage();

        const domainInput = screen.getByPlaceholderText(t('WIDGET_BUILDER.EMBED.DOMAINS_PLACEHOLDER'));
        fireEvent.change(domainInput, { target: { value: 'GomMoc.vn' } });
        fireEvent.keyDown(domainInput, { key: 'Enter' });

        expect(patchJson).not.toHaveBeenCalled();
        expect(screen.getByText('gommoc.vn')).toBeInTheDocument();
        expect(screen.getByText(t('SETTINGS_DRAFT.UNSAVED'))).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));
        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        const [, payload] = patchJson.mock.calls[0] as [string, { channel: { allowed_domains: string } }];
        expect(payload.channel.allowed_domains).toBe('gommoc.vn');
    });

    it('hiện "Có thay đổi chưa lưu" chỉ khi đang sửa dở, và Huỷ trả lại giá trị đã lưu', async () => {
        await renderPage();

        expect(screen.queryByText(t('SETTINGS_DRAFT.UNSAVED'))).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'Trái' }));
        expect(screen.getByText(t('SETTINGS_DRAFT.UNSAVED'))).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.CANCEL') }));
        expect(screen.queryByText(t('SETTINGS_DRAFT.UNSAVED'))).not.toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Phải' })).toHaveAttribute('aria-checked', 'true');
    });

    it('lỗi 422 hiện đúng ô kênh khác gây lỗi, không rơi vào thẻ khác', async () => {
        const error = new ApiError(422, { errors: { 'other_channels.0': ['Kênh này chưa đúng định dạng'] } });
        patchJson.mockRejectedValue(error);
        await renderPage();

        // Thêm một dòng kênh để có ô ở vị trí 0 nhận lỗi (danh sách mặc định rỗng).
        fireEvent.click(screen.getByRole('button', { name: t('WIDGET_BUILDER.CHANNELS.ADD') }));
        fireEvent.click(screen.getByRole('button', { name: t('SETTINGS_DRAFT.SAVE') }));

        await screen.findByText('Kênh này chưa đúng định dạng');
    });
});
