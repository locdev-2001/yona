import { getJson, postJson } from 'dashboard/helper/apiClient';
import type { Conversation, ContactMeta } from '../types';
import type { ChannelOption, ComposeDraft } from './composeDraft';

const accountApi = (accountId: number) => `/api/v1/accounts/${accountId}`;

/** Hộp thư người dùng được dùng để nhắn tới liên hệ, kèm địa chỉ khách ở từng kênh và lý do khi chưa gửi được. */
export async function fetchContactableInboxes(accountId: number, contactId: number): Promise<ChannelOption[]> {
    const response = await getJson<{ payload: ChannelOption[] }>(
        `${accountApi(accountId)}/contacts/${contactId}/contactable_inboxes`,
    );
    return response.payload ?? [];
}

export interface EmailVerification {
    email: string;
    deliverable: boolean;
    reason: string | null;
}

/** Cú pháp + tên miền nhận thư (máy chủ kiểm, có cache theo tên miền). */
export function verifyEmailAddress(accountId: number, email: string): Promise<EmailVerification> {
    return postJson<EmailVerification>(`${accountApi(accountId)}/email_addresses/verify`, { email });
}

export function fetchContactMeta(accountId: number, contactId: number): Promise<ContactMeta> {
    return getJson<{ payload: ContactMeta }>(`${accountApi(accountId)}/contacts/${contactId}`).then(
        response => response.payload,
    );
}

/**
 * Bước duy nhất biến bản nháp thành hội thoại thật: tạo liên hệ nếu người nhận
 * còn là địa chỉ mới, rồi mở hội thoại (không kèm tin — tin đi qua đường gửi
 * chung của khung chat). Liên hệ tạo xong được báo ra ngay để lần thử lại không
 * tạo trùng khi bước mở hội thoại bị từ chối.
 */
export async function createConversationFromDraft(
    accountId: number,
    draft: ComposeDraft,
    onContactCreated: (contact: ContactMeta) => void,
): Promise<Conversation> {
    const { recipient, target, subject } = draft;
    if (!recipient || !target) throw new Error('Compose draft is incomplete');

    let contactId: number;
    if (recipient.kind === 'new') {
        const field = recipient.addressType === 'email' ? 'email' : 'phone_number';
        const created = await postJson<{ payload: { contact: ContactMeta } }>(`${accountApi(accountId)}/contacts`, {
            [field]: recipient.address,
        });
        contactId = created.payload.contact.id;
        onContactCreated(created.payload.contact);
    } else {
        contactId = recipient.contact.id;
    }

    const mailSubject = subject.trim();
    return postJson<Conversation>(`${accountApi(accountId)}/conversations`, {
        inbox_id: target.inbox.id,
        contact_id: contactId,
        ...(mailSubject ? { additional_attributes: { mail_subject: mailSubject } } : {}),
    });
}
