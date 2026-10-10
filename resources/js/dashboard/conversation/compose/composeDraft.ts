import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import type { ContactMeta } from '../types';

// Trạng thái bản nháp hội thoại mới trong khung Inbox: người nhận, MỘT kênh gửi,
// chủ đề (kênh thư). Bản nháp chỉ sống trong state — chưa có gì trên máy chủ cho
// tới lần gửi đầu tiên.

export type RecipientAddressType = 'email' | 'phone';

export type ComposeRecipient =
    | { kind: 'contact'; contact: ContactMeta }
    // Liên hệ chưa có: chỉ tạo khi gửi, không tạo lúc chọn.
    | { kind: 'new'; address: string; addressType: RecipientAddressType };

export interface ComposeInbox {
    id: number;
    name: string;
    channel_type: string;
    capabilities?: readonly string[] | null;
    platform?: ChannelPlatform | null;
    avatar_url?: string;
    reauthorization_required?: boolean;
}

/** Một hộp thư gửi được tới người nhận, đúng hình dạng phần tử của `contactable_inboxes`. */
export interface ChannelOption {
    inbox: ComposeInbox;
    source_id: string | null;
    // Địa chỉ của khách ở kênh này mà người trực đọc hiểu được (email/SĐT); null khi kênh chỉ biết mã nội bộ.
    display_address: string | null;
    available: boolean;
    reason: string | null;
}

export type EmailCheck =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'deliverable' }
    | { status: 'undeliverable'; reason: string | null };

export interface ComposeDraft {
    recipient: ComposeRecipient | null;
    target: ChannelOption | null;
    subject: string;
    emailCheck: EmailCheck;
    isSending: boolean;
    showErrors: boolean;
    error: string | null;
}

export const EMPTY_COMPOSE_DRAFT: ComposeDraft = {
    recipient: null,
    target: null,
    subject: '',
    emailCheck: { status: 'idle' },
    isSending: false,
    showErrors: false,
    error: null,
};

export const UNAVAILABLE_REASON = {
    MESSAGING_WINDOW_CLOSED: 'messaging_window_closed',
    REAUTHORIZATION_REQUIRED: 'reauthorization_required',
    EMAIL_UNDELIVERABLE: 'email_undeliverable',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const PHONE_SEPARATORS = /[\s().-]/g;
const NON_DIGITS = /\D/g;
const LEADING_ZEROS = /^0+/;
// Phần cuối chung tối thiểu để coi hai cách viết là cùng một số (đủ dài để không trùng nhầm).
const MIN_SHARED_PHONE_DIGITS = 8;

/** Chuỗi gõ ở ô "Đến" có phải email/SĐT để tạo liên hệ mới không. */
export function detectNewRecipient(query: string): Extract<ComposeRecipient, { kind: 'new' }> | null {
    const value = query.trim();
    if (EMAIL_PATTERN.test(value)) return { kind: 'new', address: value.toLowerCase(), addressType: 'email' };

    const phone = value.replace(PHONE_SEPARATORS, '');
    if (PHONE_PATTERN.test(phone)) return { kind: 'new', address: phone, addressType: 'phone' };

    return null;
}

/**
 * Hai cách viết của cùng một số (0901…, +84901…, 84 901…) có khớp nhau không. Không
 * đoán mã nước: bỏ tiền tố, so phần đuôi chung — máy chủ vẫn là nơi chuẩn hoá thật.
 */
export function isSamePhoneNumber(left: string | null | undefined, right: string | null | undefined): boolean {
    const leftDigits = (left ?? '').replace(NON_DIGITS, '').replace(LEADING_ZEROS, '');
    const rightDigits = (right ?? '').replace(NON_DIGITS, '').replace(LEADING_ZEROS, '');
    const [shorter, longer] = leftDigits.length <= rightDigits.length ? [leftDigits, rightDigits] : [rightDigits, leftDigits];

    return shorter.length >= MIN_SHARED_PHONE_DIGITS && longer.endsWith(shorter);
}

/** Liên hệ trong kết quả tìm đã mang đúng địa chỉ vừa gõ — khi đó không mời tạo liên hệ mới. */
export function contactHasAddress(
    contact: Pick<ContactMeta, 'email' | 'phone_number'>,
    recipient: Extract<ComposeRecipient, { kind: 'new' }>,
): boolean {
    return recipient.addressType === 'email'
        ? contact.email?.toLowerCase() === recipient.address
        : isSamePhoneNumber(contact.phone_number, recipient.address);
}

/**
 * Liên hệ chưa tồn tại thì chưa hỏi được máy chủ: chỉ hộp khai mở hội thoại chủ
 * động VÀ biết loại địa chỉ đó của khách (profile_email / profile_phone).
 */
export function optionsForNewRecipient(
    inboxes: readonly ComposeInbox[],
    recipient: Extract<ComposeRecipient, { kind: 'new' }>,
): ChannelOption[] {
    const addressCapability = recipient.addressType === 'email' ? 'profile_email' : 'profile_phone';

    return inboxes
        .filter(inbox => inboxSupports(inbox, 'conversation_outbound_start') && inboxSupports(inbox, addressCapability))
        .map(inbox => ({
            inbox,
            source_id: recipient.address,
            display_address: recipient.address,
            available: !inbox.reauthorization_required,
            reason: inbox.reauthorization_required ? UNAVAILABLE_REASON.REAUTHORIZATION_REQUIRED : null,
        }));
}

/** Giữ kênh đang chọn nếu còn trong danh sách mới, không thì tự chọn khi chỉ có một kênh gửi được. */
export function resolveTarget(options: readonly ChannelOption[], current: ChannelOption | null): ChannelOption | null {
    const kept = current ? options.find(option => option.inbox.id === current.inbox.id && option.available) : undefined;
    if (kept) return kept;

    const available = options.filter(option => option.available);
    return available.length === 1 ? available[0] : null;
}

// Kênh thư cần chủ đề. Cùng phép nhận diện ô soạn đang dùng cho đầu thư (To/Cc/Bcc).
export function inboxNeedsSubject(inbox: ComposeInbox | null | undefined): boolean {
    return inbox?.channel_type === INBOX_TYPES.EMAIL;
}

/** Khoá i18n giải thích vì sao bản nháp chưa gửi được; null = gửi được. */
export function draftBlocker(draft: ComposeDraft): string | null {
    if (!draft.recipient) return 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.NO_RECIPIENT';
    if (draft.emailCheck.status === 'checking') return 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.EMAIL_CHECKING';
    if (draft.emailCheck.status === 'undeliverable') return 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.EMAIL_UNDELIVERABLE';
    if (!draft.target?.available) return 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.NO_CHANNEL';
    if (inboxNeedsSubject(draft.target.inbox) && !draft.subject.trim()) {
        return 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.SUBJECT_REQUIRED';
    }
    return null;
}

/** Ô soạn mở khi đã có người nhận và kênh gửi được; chủ đề kiểm lúc bấm gửi để không khoá ô soạn khi đang gõ. */
export function canComposeIn(draft: ComposeDraft): boolean {
    const blocker = draftBlocker(draft);
    return !draft.isSending && (blocker === null || blocker === 'COMPOSE_NEW_CONVERSATION.DRAFT.ERRORS.SUBJECT_REQUIRED');
}

export function recipientLabel(recipient: ComposeRecipient): { name: string; secondary: string } {
    if (recipient.kind === 'new') return { name: recipient.address, secondary: '' };

    const { contact } = recipient;
    const secondary = contact.email || contact.phone_number || '';
    return { name: contact.name || secondary, secondary: contact.name ? secondary : '' };
}

export function unavailableReasonKey(reason: string | null): string {
    switch (reason) {
        case UNAVAILABLE_REASON.MESSAGING_WINDOW_CLOSED:
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.MESSAGING_WINDOW_CLOSED';
        case UNAVAILABLE_REASON.REAUTHORIZATION_REQUIRED:
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.REAUTHORIZATION_REQUIRED';
        case UNAVAILABLE_REASON.EMAIL_UNDELIVERABLE:
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.EMAIL_UNDELIVERABLE';
        default:
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.UNAVAILABLE.OTHER';
    }
}

export function emailReasonKey(reason: string | null): string {
    switch (reason) {
        case 'invalid_syntax':
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.INVALID_SYNTAX';
        case 'domain_not_found':
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.DOMAIN_NOT_FOUND';
        case 'domain_no_mail':
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.DOMAIN_NO_MAIL';
        default:
            return 'COMPOSE_NEW_CONVERSATION.DRAFT.EMAIL_CHECK.UNDELIVERABLE';
    }
}
