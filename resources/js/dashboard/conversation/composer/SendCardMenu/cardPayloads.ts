// Dựng payload tin có cấu trúc từ form "Gửi thẻ". Cùng luật với máy chủ
// (app/Messaging/Structured/Types/*) để báo lỗi ngay trong form; máy chủ vẫn kiểm lại.

export type CardKind = 'quick_replies' | 'product' | 'bank_transfer' | 'schedule';

// content_type máy chủ lưu (StructuredTypeRegistry) → loại thẻ form này vẽ.
// `kind.toUpperCase()` khớp thẳng khối lang CONVERSATION.SEND_CARD.<KIND> nên
// dùng chung cho cả tiêu đề form lẫn nhãn "loại thẻ" trong danh sách câu trả lời mẫu.
export const CARD_KIND_BY_CONTENT_TYPE: Record<string, CardKind> = {
    input_select: 'quick_replies',
    cards: 'product',
    bank_transfer: 'bank_transfer',
    webview: 'schedule',
};

export const QUICK_REPLY_LIMITS = { min: 2, max: 6, title: 80 } as const;

export interface QuickRepliesDraft {
    question: string;
    options: string[];
}

export interface StructuredDraft {
    contentType: string;
    content?: string;
    contentAttributes: Record<string, unknown>;
}

export function quickRepliesError(draft: QuickRepliesDraft): string | null {
    const options = draft.options.map(option => option.trim()).filter(Boolean);

    if (!draft.question.trim()) return 'QUESTION_REQUIRED';
    if (options.length < QUICK_REPLY_LIMITS.min) return 'TOO_FEW_OPTIONS';
    if (options.some(option => option.length > QUICK_REPLY_LIMITS.title)) return 'OPTION_TOO_LONG';
    if (new Set(options.map(option => option.toLowerCase())).size !== options.length) return 'DUPLICATE_OPTION';

    return null;
}

export const quickRepliesPayload = (draft: QuickRepliesDraft): StructuredDraft => ({
    contentType: 'input_select',
    content: draft.question.trim(),
    contentAttributes: {
        items: draft.options
            .map(option => option.trim())
            .filter(Boolean)
            .map(title => ({ title, value: title })),
    },
});

export interface ProductDraft {
    title: string;
    mediaUrl: string;
    price: string;
    compareAt: string;
    stockLabel: string;
    maxQuantity: string;
    /** Mỗi nhóm: tên + các lựa chọn cách nhau bằng dấu phẩy ("Màu" / "Lam, Ngà, Ngọc"). */
    variants: { name: string; options: string }[];
    link: string;
}

/** "1.250.000" hay "1250000đ" → 1250000; rỗng → null. */
export const parseAmount = (value: string): number | null => {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits) : null;
};

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

export function productError(draft: ProductDraft): string | null {
    const price = parseAmount(draft.price);
    const compareAt = parseAmount(draft.compareAt);

    if (!draft.title.trim()) return 'TITLE_REQUIRED';
    if (draft.compareAt.trim() && (price === null || compareAt === null || compareAt <= price)) return 'COMPARE_AT_INVALID';
    if (draft.link.trim() && !isHttpUrl(draft.link)) return 'LINK_INVALID';
    if (draft.mediaUrl.trim() && !isHttpUrl(draft.mediaUrl)) return 'LINK_INVALID';
    if (draft.variants.some(variant => variant.name.trim() && !variant.options.split(',').some(option => option.trim()))) {
        return 'VARIANT_EMPTY';
    }

    return null;
}

/** `labels`: chữ trên nút theo ngôn ngữ của account (khách đọc). */
export function productPayload(draft: ProductDraft, labels: { order: string; view: string }): StructuredDraft {
    const price = parseAmount(draft.price);
    const compareAt = parseAmount(draft.compareAt);
    const variants = draft.variants
        .filter(variant => variant.name.trim())
        .map(variant => ({
            name: variant.name.trim(),
            options: variant.options
                .split(',')
                .map(option => option.trim())
                .filter(Boolean)
                .map(label => ({ value: label, label })),
        }));
    const maxQuantity = parseAmount(draft.maxQuantity);

    return {
        contentType: 'cards',
        contentAttributes: {
            items: [
                {
                    title: draft.title.trim(),
                    ...(draft.mediaUrl.trim() ? { media_url: draft.mediaUrl.trim() } : {}),
                    ...(price !== null ? { price: { amount: price, ...(compareAt !== null ? { compare_at: compareAt } : {}) } } : {}),
                    ...(draft.stockLabel.trim() ? { stock_label: draft.stockLabel.trim() } : {}),
                    ...(maxQuantity ? { max_quantity: maxQuantity } : {}),
                    ...(variants.length ? { variants } : {}),
                    actions: [
                        { kind: 'order', label: labels.order },
                        ...(draft.link.trim() ? [{ kind: 'link', label: labels.view, url: draft.link.trim() }] : []),
                    ],
                },
            ],
        },
    };
}

/** Bản xem trước: thêm % giảm như máy chủ sẽ tự tính, để thẻ trông đúng như khách thấy. */
export function withPreviewDiscount(draft: StructuredDraft): StructuredDraft {
    const items = (draft.contentAttributes.items as Record<string, unknown>[] | undefined) ?? [];

    return {
        ...draft,
        contentAttributes: {
            ...draft.contentAttributes,
            items: items.map(item => {
                const price = item.price as { amount: number; compare_at?: number } | undefined;
                if (!price?.compare_at || price.compare_at <= price.amount) return item;

                const discount = Math.round(((price.compare_at - price.amount) / price.compare_at) * 100);
                return { ...item, price: { ...price, currency: 'VND', discount_percent: discount } };
            }),
        },
    };
}

export interface PaymentAccountOption {
    id: number;
    bank_bin: string;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    memo_template: string | null;
    is_default: boolean;
}

/** Thuộc tính thẻ chuyển khoản để xem trước, cùng hình dạng bản chụp máy chủ lưu vào tin. */
export function bankTransferPreviewAttributes(
    account: PaymentAccountOption,
    qrPayload: string,
    amount: number | null | undefined,
    memo: string,
): Record<string, unknown> {
    const trimmedMemo = memo.trim();

    return {
        bank_bin: account.bank_bin,
        bank_code: account.bank_code,
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_name: account.account_name,
        ...(amount ? { amount: { amount, currency: 'VND' } } : {}),
        ...(trimmedMemo ? { memo: trimmedMemo } : {}),
        qr_payload: qrPayload,
    };
}

export interface BankTransferDraft {
    paymentAccountId: number | null;
    amount: string;
    memo: string;
}

/** Nội dung mặc định lấy từ mẫu của tài khoản, `{ma_hoi_thoai}` = số hội thoại (khớp máy chủ). */
// Bản nháp chưa có mã hội thoại thì bỏ trống chỗ mã trong nội dung chuyển khoản.
export const defaultMemo = (account: PaymentAccountOption | undefined, conversationDisplayId: number | string | null): string =>
    (account?.memo_template ?? '').replace('{ma_hoi_thoai}', conversationDisplayId === null ? '' : String(conversationDisplayId)).replace(/\s{2,}/g, ' ').trim();

export function bankTransferError(draft: BankTransferDraft): string | null {
    if (!draft.paymentAccountId) return 'ACCOUNT_REQUIRED';
    if (draft.amount.trim() && !parseAmount(draft.amount)) return 'AMOUNT_INVALID';

    return null;
}

/** Máy chủ tự tra ngân hàng, số tài khoản, dựng mã QR: chỉ gửi mã tài khoản, số tiền, nội dung. */
export function bankTransferPayload(draft: BankTransferDraft): StructuredDraft {
    const amount = parseAmount(draft.amount);

    return {
        contentType: 'bank_transfer',
        contentAttributes: {
            payment_account_id: draft.paymentAccountId,
            ...(amount ? { amount } : {}),
            ...(draft.memo.trim() ? { memo: draft.memo.trim() } : {}),
        },
    };
}

export interface ScheduleDraft {
    title: string;
    note: string;
    /** Mỗi dòng một khung: ngày (YYYY-MM-DD) + nhãn giờ. */
    slots: { date: string; label: string }[];
}

export function scheduleError(draft: ScheduleDraft): string | null {
    if (!draft.title.trim()) return 'TITLE_REQUIRED';
    if (!draft.slots.some(slot => slot.date && slot.label.trim())) return 'SLOTS_REQUIRED';

    return null;
}

export const schedulePayload = (draft: ScheduleDraft): StructuredDraft => ({
    contentType: 'webview',
    contentAttributes: {
        page: 'schedule',
        title: draft.title.trim(),
        data: {
            slots: draft.slots
                .filter(slot => slot.date && slot.label.trim())
                .map((slot, index) => ({ date: slot.date, label: slot.label.trim(), value: `${slot.date}-${index + 1}` })),
            ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        },
    },
});
