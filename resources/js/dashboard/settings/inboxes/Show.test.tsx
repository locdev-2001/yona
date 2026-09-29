import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import capabilityMatrix from '../../../../../tests/Contracts/Channels/capability-matrix.snapshot.json';
import { setLocale, t } from '../../../i18n';
import InboxShow from './Show';
import type { Inbox } from './types';

const getJson = vi.fn();
const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 7, name: 'Chị Lan', display_name: 'Chị Lan', ui_settings: {} } },
            currentAccount: { id: 3, features: { inbound_emails: true } },
            globalConfig: { installationName: 'Yona' },
        },
    }),
    router: { visit: vi.fn(), reload: vi.fn() },
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('../../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: (...args: unknown[]) => getJson(...args),
    patchJson: (...args: unknown[]) => patchJson(...args),
    postJson: vi.fn(),
    putForm: vi.fn(),
    deleteJson: vi.fn(),
    parseApiErrorMessage: () => '',
}));

// Thanh tab đo kích thước bằng ResizeObserver, jsdom không có.
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
);

const webWidgetInbox = {
    id: 140,
    name: 'Shop Cũ Mai Anh',
    channel_type: 'Channel::WebWidget',
    capabilities: capabilityMatrix['Channel::WebWidget'],
    avatar_url: '',
    business_name: null,
    sender_name_type: 'friendly',
    continuity_via_email: true,
    enable_email_collect: true,
    allow_messages_after_resolved: true,
    greeting_enabled: false,
    greeting_message: '',
    lock_to_single_conversation: false,
    working_hours_enabled: false,
    working_hours: [],
    timezone: 'UTC',
    website_url: 'shopcu.vn',
    welcome_title: '',
    welcome_tagline: '',
    widget_color: '#1f93ff',
    selected_feature_flags: [],
    reply_time: 'in_a_few_minutes',
    web_widget_script: '',
} as unknown as Inbox;

const renderShow = async () => {
    render(<InboxShow inboxId={140} senderEmailAddress="hello@yona.vn" timezoneOptions={[{ label: 'UTC (UTC+00:00)', value: 'UTC' }]} />);
    await screen.findByText(t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.TITLE'));
};

describe('InboxShow — tab Cài đặt của hộp thư website', () => {
    beforeEach(() => {
        setLocale('vi');
        getJson.mockReset();
        patchJson.mockReset();
        getJson.mockResolvedValue(webWidgetInbox);
    });

    it('nút Lưu tên doanh nghiệp chỉ gửi tên doanh nghiệp, ô khác đang sửa dở giữ nguyên', async () => {
        patchJson.mockResolvedValue({ ...webWidgetInbox, business_name: 'Tiệm Hoa Mai Anh' });
        await renderShow();

        const inboxNameInput = screen.getByDisplayValue('Shop Cũ Mai Anh');
        fireEvent.change(inboxNameInput, { target: { value: 'Tên sửa dở chưa lưu' } });

        fireEvent.click(screen.getByRole('button', { name: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.BUTTON_TEXT') }));
        fireEvent.change(screen.getByRole('textbox', { name: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.PLACEHOLDER') }), {
            target: { value: '  Tiệm Hoa Mai Anh ' },
        });
        fireEvent.click(screen.getByRole('button', { name: t('INBOX_MGMT.EDIT.SENDER_NAME_SECTION.BUSINESS_NAME.SAVE_BUTTON_TEXT') }));

        await waitFor(() => expect(patchJson).toHaveBeenCalledTimes(1));
        expect(patchJson).toHaveBeenCalledWith('/api/v1/accounts/3/inboxes/140', { business_name: 'Tiệm Hoa Mai Anh' });
        await waitFor(() => expect(screen.getByDisplayValue('Tên sửa dở chưa lưu')).toBeInTheDocument());
    });

    it('không còn ô Trung tâm trợ giúp và Domain trang web', async () => {
        await renderShow();

        for (const key of [
            'INBOX_MGMT.HELP_CENTER.LABEL',
            'INBOX_MGMT.HELP_CENTER.PLACEHOLDER',
            'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_DOMAIN.LABEL',
            'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_DOMAIN.PLACEHOLDER',
        ]) {
            expect(document.body.textContent).not.toContain(t(key));
        }
        expect(screen.queryByDisplayValue('shopcu.vn')).not.toBeInTheDocument();
        expect(document.querySelector(`[placeholder="${t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_DOMAIN.PLACEHOLDER')}"]`)).toBeNull();
    });
});

const zaloInbox = {
    ...webWidgetInbox,
    id: 59,
    name: 'Zalo Shop Mai Anh',
    channel_type: 'Channel::Zalo',
    capabilities: capabilityMatrix['Channel::Zalo'],
    zalo_state: 'connected',
    zalo_display_name: 'Mai Anh',
} as unknown as Inbox;

const apiInbox = {
    ...webWidgetInbox,
    id: 12,
    name: 'Kho API',
    channel_type: 'Channel::Api',
    capabilities: capabilityMatrix['Channel::Api'],
    webhook_url: 'https://kho.vn/hook',
} as unknown as Inbox;

const renderInbox = async (inbox: Inbox) => {
    getJson.mockImplementation((url: string) => Promise.resolve(url.endsWith(`/inboxes/${inbox.id}`) ? inbox : {}));
    render(<InboxShow inboxId={inbox.id} senderEmailAddress="hello@yona.vn" timezoneOptions={[]} />);
    await screen.findByDisplayValue(inbox.name);
};

const visibleTabNames = () =>
    Array.from(document.querySelectorAll('li > a')).map(tab => tab.textContent?.trim() ?? '');

describe('InboxShow — tab và khối dựng theo khai báo của kênh', () => {
    beforeEach(() => {
        setLocale('vi');
        getJson.mockReset();
    });

    it('Zalo có mục Điều hướng hội thoại, không có tab Cấu hình hay Form trước chat', async () => {
        await renderInbox(zaloInbox);

        expect(screen.getByText(t('INBOX_MGMT.SETTINGS_POPUP.LOCK_TO_SINGLE_CONVERSATION'))).toBeInTheDocument();
        expect(visibleTabNames()).not.toContain(t('INBOX_MGMT.TABS.CONFIGURATION'));
        expect(visibleTabNames()).not.toContain(t('INBOX_MGMT.TABS.PRE_CHAT_FORM'));
        expect(screen.queryByText(t('INBOX_MGMT.WIDGET_FEATURES'))).not.toBeInTheDocument();
    });

    it('Website có Form trước chat + Cấu hình, không có mục Điều hướng hội thoại', async () => {
        await renderInbox(webWidgetInbox);

        expect(visibleTabNames()).toEqual(
            expect.arrayContaining([t('INBOX_MGMT.TABS.PRE_CHAT_FORM'), t('INBOX_MGMT.TABS.CONFIGURATION')]),
        );
        expect(screen.getByText(t('INBOX_MGMT.WIDGET_FEATURES'))).toBeInTheDocument();
        expect(screen.queryByText(t('INBOX_MGMT.SETTINGS_POPUP.LOCK_TO_SINGLE_CONVERSATION'))).not.toBeInTheDocument();
    });

    it('API có ô webhook, mục Điều hướng hội thoại và tab Cấu hình', async () => {
        await renderInbox(apiInbox);

        expect(screen.getByDisplayValue('https://kho.vn/hook')).toBeInTheDocument();
        expect(screen.getByText(t('INBOX_MGMT.SETTINGS_POPUP.LOCK_TO_SINGLE_CONVERSATION'))).toBeInTheDocument();
        expect(visibleTabNames()).toContain(t('INBOX_MGMT.TABS.CONFIGURATION'));
        expect(visibleTabNames()).not.toContain(t('INBOX_MGMT.TABS.PRE_CHAT_FORM'));
    });
});
