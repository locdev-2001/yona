import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '../../../i18n';

const { getJson, postJson, visit, alertSpy } = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    visit: vi.fn(),
    alertSpy: vi.fn(),
}));

const EMAIL_INBOX = {
    id: 16,
    name: 'shop@yona.vn',
    channel_type: 'Channel::Email',
    capabilities: ['conversation_outbound_start', 'profile_email', 'outbound_text'],
    platform: { key: 'gmail', name: 'Gmail', logo_url: '' },
};
const ZALO_INBOX = { id: 3, name: 'Zalo shop', channel_type: 'Channel::Zalo', capabilities: ['outbound_text', 'outbound_sticker'] };
const TELEGRAM_INBOX = { id: 5, name: 'Telegram shop', channel_type: 'Channel::Telegram', capabilities: ['outbound_text'] };

vi.mock('@inertiajs/react', () => ({
    router: { visit },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Lộc', ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
            inboxes: [EMAIL_INBOX, ZALO_INBOX, TELEGRAM_INBOX],
        },
    }),
}));

vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    getJson: (url: string) => getJson(url),
    postJson: (url: string, body: Record<string, unknown>) => postJson(url, body),
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));

// Ô soạn thật đã có test riêng; ở đây chỉ cần một lối gửi đi qua đúng hàm của context.
vi.mock('../conversationbox/ReplyBox', async () => {
    const { useConversation } = await import('../ConversationContext');
    return {
        default: function ReplyBoxProbe() {
            const { sendReply } = useConversation();
            return (
                <button type="button" onClick={() => sendReply({ content: 'Chào chị', isPrivate: false })}>
                    gửi-thử
                </button>
            );
        },
    };
});

import { ApiError } from 'dashboard/helper/apiClient';
import { ConversationProvider } from '../ConversationContext';
import ComposeDraftPane from './ComposeDraftPane';

const LAN = { id: 9, name: 'Chị Lan', email: 'lan@example.com', phone_number: '+84901234567' };
const CREATED_CONVERSATION = {
    id: 77,
    uuid: 'u-77',
    account_id: 2,
    inbox_id: 3,
    meta: { sender: LAN },
    messages: [],
    status: 'open',
    priority: null,
    labels: [],
    muted: false,
    can_reply: true,
    custom_attributes: {},
    additional_attributes: {},
    unread_count: 0,
    last_activity_at: 100,
    timestamp: 100,
};

const contactableInboxes = [
    { inbox: ZALO_INBOX, source_id: 'zalo-uid-9', available: true, reason: null },
    { inbox: TELEGRAM_INBOX, source_id: 'tg-9', available: false, reason: 'messaging_window_closed' },
];

function routeGet(url: string): Promise<unknown> {
    if (url.includes('/conversations?')) {
        return Promise.resolve({ data: { meta: { mine_count: 0, assigned_count: 0, unassigned_count: 0, all_count: 0 }, payload: [] } });
    }
    if (url.includes('/contacts/search')) return Promise.resolve({ payload: url.includes('lan') ? [LAN] : [] });
    if (url.endsWith('/contacts/9/contactable_inboxes')) return Promise.resolve({ payload: contactableInboxes });
    if (url.endsWith('/contacts/9')) return Promise.resolve({ payload: LAN });
    return Promise.resolve({ payload: [] });
}

const postedUrls = () => postJson.mock.calls.map(([url]) => url as string);

function renderDraft(composeContactId: number | null = null) {
    return render(
        <ConversationProvider isComposing composeContactId={composeContactId}>
            <ComposeDraftPane />
        </ConversationProvider>,
    );
}

async function typeRecipient(value: string) {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } });
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
    });
}

describe('bản nháp hội thoại mới trong Inbox', () => {
    beforeEach(() => {
        getJson.mockReset();
        getJson.mockImplementation(routeGet);
        postJson.mockReset();
        visit.mockReset();
        alertSpy.mockReset();
    });

    it('chọn liên hệ có sẵn: thẻ kênh có địa chỉ của khách, thẻ mờ nói lý do, một kênh khả dụng thì tự chọn', async () => {
        renderDraft();
        await typeRecipient('lan');
        fireEvent.click(await screen.findByRole('option', { name: /Chị Lan/ }));

        const zalo = await screen.findByRole('radio', { name: /Zalo shop/ });
        const telegram = screen.getByRole('radio', { name: /Telegram shop/ });
        expect(zalo.textContent).not.toContain('zalo-uid-9');
        await waitFor(() => expect(zalo.getAttribute('aria-checked')).toBe('true'));
        expect((telegram as HTMLButtonElement).disabled).toBe(true);
        expect(telegram.textContent).toContain(t('COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.MESSAGING_WINDOW_CLOSED'));
    });

    it('gửi lần đầu: mở hội thoại không kèm tin, gửi tin qua đường chung, rồi sang hội thoại thật', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations')
                ? Promise.resolve(CREATED_CONVERSATION)
                : Promise.resolve({ id: 501, conversation_id: 77, content: 'Chào chị', message_type: 1, created_at: 101 }),
        );
        renderDraft(9);
        await waitFor(() => expect(screen.getByRole('radio', { name: /Zalo shop/ }).getAttribute('aria-checked')).toBe('true'));

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));

        await waitFor(() => expect(visit).toHaveBeenCalled());
        expect(postedUrls()).toEqual(['/api/v1/accounts/2/conversations', '/api/v1/accounts/2/conversations/77/messages']);
        expect(postJson.mock.calls[0][1]).toEqual({ inbox_id: 3, contact_id: 9 });
        expect(postJson.mock.calls[1][1]).toMatchObject({ content: 'Chào chị', private: false });
        expect(visit.mock.calls[0][0]).toBe('/app/accounts/2/conversations/77');
    });

    it('email ảo: báo đỏ ngay khi chọn và không cho gửi', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/email_addresses/verify')
                ? Promise.resolve({ email: 'khach@khong-co.vn', deliverable: false, reason: 'domain_not_found' })
                : Promise.reject(new Error('không được gọi')),
        );
        renderDraft();
        await typeRecipient('khach@khong-co.vn');
        fireEvent.click(await screen.findByRole('option', { name: /khach@khong-co\.vn/ }));

        expect((await screen.findByRole('alert')).textContent).toContain(
            t('COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.DOMAIN_NOT_FOUND'),
        );
        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));

        expect(alertSpy).toHaveBeenCalledWith(t('COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.EMAIL_UNDELIVERABLE'));
        expect(postedUrls()).toEqual(['/api/v1/accounts/2/email_addresses/verify']);
    });

    it('email mới nhận thư được: tạo liên hệ khi gửi, chủ đề đi kèm hội thoại; máy chủ từ chối thì hiện nguyên lý do và thử lại không tạo trùng liên hệ', async () => {
        const created = { id: 41, name: 'moi', email: 'moi@that.vn' };
        let conversationAttempts = 0;
        postJson.mockImplementation((url: string) => {
            if (url.endsWith('/email_addresses/verify')) return Promise.resolve({ email: 'moi@that.vn', deliverable: true, reason: null });
            if (url.endsWith('/contacts')) return Promise.resolve({ payload: { contact: created } });
            if (url.endsWith('/conversations')) {
                conversationAttempts += 1;
                return conversationAttempts === 1
                    ? Promise.reject(new ApiError(422, { error: 'Không gửi được thư tới moi@that.vn: hộp thư đầy' }))
                    : Promise.resolve({ ...CREATED_CONVERSATION, inbox_id: 16 });
            }
            return Promise.resolve({ id: 502, conversation_id: 77, content: 'Chào chị', message_type: 1, created_at: 101 });
        });
        getJson.mockImplementation((url: string) =>
            url.endsWith('/contacts/41/contactable_inboxes')
                ? Promise.resolve({ payload: [{ inbox: EMAIL_INBOX, source_id: 'moi@that.vn', available: true, reason: null }] })
                : routeGet(url),
        );
        renderDraft();
        await typeRecipient('moi@that.vn');
        fireEvent.click(await screen.findByRole('option', { name: /moi@that\.vn/ }));
        await waitFor(() => expect(screen.getByRole('radio', { name: /shop@yona\.vn/ }).getAttribute('aria-checked')).toBe('true'));
        fireEvent.change(screen.getByRole('textbox', { name: t('COMPOSE_NEW_CONVERSATION.DRAFT.SUBJECT_LABEL') }), {
            target: { value: 'Báo giá' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        expect(await screen.findByText('Không gửi được thư tới moi@that.vn: hộp thư đầy')).toBeTruthy();
        expect(visit).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        expect(postedUrls().filter(url => url.endsWith('/contacts'))).toHaveLength(1);
        const conversationBodies = postJson.mock.calls.filter(([url]) => (url as string).endsWith('/conversations')).map(([, body]) => body);
        expect(conversationBodies).toEqual([
            { inbox_id: 16, contact_id: 41, additional_attributes: { mail_subject: 'Báo giá' } },
            { inbox_id: 16, contact_id: 41, additional_attributes: { mail_subject: 'Báo giá' } },
        ]);
    });

    it('số điện thoại mới mà không kênh nào mở hội thoại chủ động được thì nói rõ', async () => {
        renderDraft();
        await typeRecipient('0901 234 999');
        fireEvent.click(await screen.findByRole('option', { name: /0901234999/ }));

        expect(await screen.findByText(t('COMPOSE_NEW_CONVERSATION.FORM.NO_INBOX_ALERT'))).toBeTruthy();
    });
});
