import { useEffect, useState } from 'react';
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

const STICKER: StickerItem = { id: 's-5', image_url: '/s/5.webp', pack_id: null, label: null };

// Phần đang nằm trong ô soạn giả (chưa gửi) — test đặt trước khi bấm gửi.
const probeComposer: { content: string; attachments: PendingAttachment[] } = { content: '', attachments: [] };

// Ô soạn thật đã có test riêng; ở đây chỉ cần các lối gửi đi qua đúng hàm của context.
vi.mock('../conversationbox/ReplyBox', async () => {
    const { useConversation } = await import('../ConversationContext');
    return {
        default: function ReplyBoxProbe() {
            const { sendReply, sendSticker, registerDraftComposer } = useConversation();
            useEffect(
                () =>
                    registerDraftComposer(() => ({
                        content: probeComposer.content,
                        replyMode: REPLY_EDITOR_MODES.REPLY,
                        attachments: probeComposer.attachments,
                    })),
                [registerDraftComposer],
            );
            return (
                <>
                    <button type="button" onClick={() => sendReply({ content: 'Chào chị', isPrivate: false })}>
                        gửi-thử
                    </button>
                    <button type="button" onClick={() => sendSticker(STICKER)}>
                        gửi-sticker
                    </button>
                </>
            );
        },
    };
});

import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import type { PendingAttachment } from 'dashboard/components/widgets/AttachmentsPreview';
import { ApiError } from 'dashboard/helper/apiClient';
import { ConversationProvider, useConversation } from '../ConversationContext';
import { draftKey, getDraft, removeDraft } from '../draftApi';
import type { StickerItem } from '../stickerApi';
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
    { inbox: ZALO_INBOX, source_id: 'zalo-uid-9', display_address: '+84901234567', available: true, reason: null },
    { inbox: TELEGRAM_INBOX, source_id: '6123456789', display_address: null, available: false, reason: 'messaging_window_closed' },
    { inbox: EMAIL_INBOX, source_id: 'lan@example.com', display_address: 'lan@example.com', available: false, reason: 'email_undeliverable' },
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
const SENT_MESSAGE = { id: 501, conversation_id: 77, content: 'Chào chị', message_type: 1, created_at: 101 };

// Trang Inbox giữ nguyên provider khi điều hướng (preserveState): bản nháp → hội thoại.
function InboxPage({ isComposing, conversationId = 0, composeContactId = null }: {
    isComposing: boolean;
    conversationId?: number;
    composeContactId?: number | null;
}) {
    return (
        <ConversationProvider isComposing={isComposing} conversationId={conversationId} composeContactId={composeContactId}>
            {isComposing ? <ComposeDraftPane /> : <OpenConversationProbe />}
        </ConversationProvider>
    );
}

function OpenConversationProbe() {
    const { messages, takeCarriedAttachments, conversationId } = useConversation();
    const [carried, setCarried] = useState<PendingAttachment[] | null>(null);
    useEffect(() => {
        if (conversationId) setCarried(takeCarriedAttachments(conversationId));
    }, [conversationId, takeCarriedAttachments]);
    return (
        <>
            <ul aria-label="tin">
                {messages.map(message => (
                    <li key={message.id}>{`${message.status}:${message.content ?? ''}`}</li>
                ))}
            </ul>
            <span data-testid="tep-mang-sang">{carried?.map(attachment => attachment.resource.name).join(',') ?? ''}</span>
        </>
    );
}

function renderDraft(composeContactId: number | null = null) {
    return render(<InboxPage isComposing composeContactId={composeContactId} />);
}

function deferred<T>() {
    let resolve: (value: T) => void = () => undefined;
    const promise = new Promise<T>(settle => {
        resolve = settle;
    });
    return { promise, resolve };
}

async function waitForZaloSelected() {
    await waitFor(() => expect(screen.getByRole('radio', { name: /Zalo shop/ }).getAttribute('aria-checked')).toBe('true'));
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
        probeComposer.content = '';
        probeComposer.attachments = [];
        removeDraft(draftKey(77, REPLY_EDITOR_MODES.REPLY));
    });

    it('chọn liên hệ có sẵn: thẻ kênh hiện địa chỉ máy chủ cho là đọc được, thẻ mờ nói lý do, một kênh khả dụng thì tự chọn', async () => {
        renderDraft();
        await typeRecipient('lan');
        fireEvent.click(await screen.findByRole('option', { name: /Chị Lan/ }));

        const zalo = await screen.findByRole('radio', { name: /Zalo shop/ });
        const telegram = screen.getByRole('radio', { name: /Telegram shop/ });
        const email = screen.getByRole('radio', { name: /shop@yona\.vn/ });
        expect(zalo.textContent).toContain('+84901234567');
        expect(zalo.textContent).not.toContain('zalo-uid-9');
        expect(telegram.textContent).not.toContain('6123456789');
        await waitFor(() => expect(zalo.getAttribute('aria-checked')).toBe('true'));
        expect((telegram as HTMLButtonElement).disabled).toBe(true);
        expect(telegram.textContent).toContain(t('COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.MESSAGING_WINDOW_CLOSED'));
        expect((email as HTMLButtonElement).disabled).toBe(true);
        expect(email.textContent).toContain(t('COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.EMAIL_UNDELIVERABLE'));
    });

    it('SĐT gõ kiểu 0901… trùng liên hệ lưu +84901… thì không mời tạo liên hệ mới', async () => {
        getJson.mockImplementation((url: string) =>
            url.includes('/contacts/search') ? Promise.resolve({ payload: [LAN] }) : routeGet(url),
        );
        renderDraft();
        await typeRecipient('0901234567');

        expect(await screen.findByRole('option', { name: /Chị Lan/ })).toBeTruthy();
        expect(screen.queryByRole('option', { name: /0901234567/ })).toBeNull();
    });

    it('tìm liên hệ lỗi thì báo lỗi tìm kiếm, không mời tạo liên hệ mới', async () => {
        getJson.mockImplementation((url: string) =>
            url.includes('/contacts/search') ? Promise.reject(new Error('mạng')) : routeGet(url),
        );
        renderDraft();
        await typeRecipient('lan@example.com');

        expect((await screen.findByRole('alert')).textContent).toBe(t('COMPOSE_NEW_CONVERSATION.CONTACT_SEARCH.ERROR_MESSAGE'));
        expect(screen.queryByRole('option')).toBeNull();
    });

    it('danh sách gợi ý đóng khi Esc hoặc rời ô, phím mũi tên đi qua từng gợi ý', async () => {
        renderDraft();
        await typeRecipient('lan');
        const input = screen.getByRole('combobox');
        const option = await screen.findByRole('option', { name: /Chị Lan/ });
        expect(input.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
        expect(input.getAttribute('aria-activedescendant')).toBe(option.id);

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeTruthy();
        fireEvent.blur(input);
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('gửi lần đầu: mở hội thoại không kèm tin, gửi tin qua đường chung, rồi sang hội thoại thật', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations')
                ? Promise.resolve(CREATED_CONVERSATION)
                : Promise.resolve({ id: 501, conversation_id: 77, content: 'Chào chị', message_type: 1, created_at: 101 }),
        );
        renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
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

    it('rời bản nháp khi đang gửi: tin vẫn đi, không bị kéo sang hội thoại mới, chỉ báo kèm lối mở', async () => {
        const creation = deferred<typeof CREATED_CONVERSATION>();
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations') ? creation.promise : Promise.resolve(SENT_MESSAGE),
        );
        const { rerender } = renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        await waitFor(() => expect((screen.getByRole('radio', { name: /Zalo shop/ }) as HTMLButtonElement).disabled).toBe(true));
        expect((screen.getByRole('button', { name: t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.CHANGE') }) as HTMLButtonElement).disabled).toBe(true);

        rerender(<InboxPage isComposing={false} conversationId={0} />);
        await act(async () => creation.resolve(CREATED_CONVERSATION));

        await waitFor(() => expect(postedUrls()).toContain('/api/v1/accounts/2/conversations/77/messages'));
        await waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith(
                t('COMPOSE_NEW_CONVERSATION.DRAFT.CREATED_ELSEWHERE'),
                expect.objectContaining({ message: t('COMPOSE_NEW_CONVERSATION.DRAFT.OPEN_CONVERSATION') }),
            ),
        );
        expect(visit).not.toHaveBeenCalled();
        expect(screen.getByRole('list', { name: 'tin' }).textContent).toBe('');

        alertSpy.mock.calls.at(-1)?.[1].onClick();
        expect(visit).toHaveBeenCalledWith('/app/accounts/2/conversations/77');
    });

    it('gửi sticker trước: chữ đang soạn thành bản nháp của hội thoại mới, tệp đang chờ đi theo sang ô soạn', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations') ? Promise.resolve(CREATED_CONVERSATION) : Promise.resolve(SENT_MESSAGE),
        );
        probeComposer.content = 'Chào chị, shop gửi báo giá ạ';
        probeComposer.attachments = [
            { currentChatId: 0, resource: new File(['x'], 'bao-gia.png'), isPrivate: false, thumb: '' },
        ];
        const { rerender } = renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-sticker' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        expect(postJson.mock.calls[1][1]).toMatchObject({ content_type: 'sticker', sticker_id: 's-5' });
        expect(getDraft(draftKey(77, REPLY_EDITOR_MODES.REPLY))).toBe('Chào chị, shop gửi báo giá ạ');
        rerender(<InboxPage isComposing={false} conversationId={77} />);
        expect((await screen.findByTestId('tep-mang-sang')).textContent).toBe('bao-gia.png');
    });

    it('gửi chữ từ ô soạn thì không nhân đôi chữ đó thành bản nháp', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations') ? Promise.resolve(CREATED_CONVERSATION) : Promise.resolve(SENT_MESSAGE),
        );
        probeComposer.content = 'Chào chị';
        renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        expect(getDraft(draftKey(77, REPLY_EDITOR_MODES.REPLY))).toBe('');
    });

    it('hội thoại đã tạo mà tin gửi hỏng: mở hội thoại mới vẫn còn tin hỏng để Gửi lại', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations')
                ? Promise.resolve(CREATED_CONVERSATION)
                : Promise.reject(new ApiError(422, { error: 'Zalo từ chối tin này' })),
        );
        const { rerender } = renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());
        expect(alertSpy).toHaveBeenCalledWith('Zalo từ chối tin này');

        rerender(<InboxPage isComposing={false} conversationId={77} />);
        await waitFor(() => expect(screen.getByRole('list', { name: 'tin' }).textContent).toBe('failed:Chào chị'));
    });

    it('điều hướng sang hội thoại mới bị huỷ thì bản nháp không kẹt ở trạng thái đang gửi', async () => {
        postJson.mockImplementation((url: string) =>
            url.endsWith('/conversations') ? Promise.resolve(CREATED_CONVERSATION) : Promise.resolve(SENT_MESSAGE),
        );
        renderDraft(9);
        await waitForZaloSelected();

        fireEvent.click(screen.getByRole('button', { name: 'gửi-thử' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());
        expect(screen.getByText(t('COMPOSE_NEW_CONVERSATION.DRAFT.SENDING'))).toBeTruthy();

        act(() => visit.mock.calls[0][1].onCancel());
        expect(screen.queryByText(t('COMPOSE_NEW_CONVERSATION.DRAFT.SENDING'))).toBeNull();
        expect((screen.getByRole('radio', { name: /Zalo shop/ }) as HTMLButtonElement).disabled).toBe(false);
    });
});
