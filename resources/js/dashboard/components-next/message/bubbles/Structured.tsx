import { useState } from 'react';

import { StructuredMessageView, type StructuredMessage } from 'shared/messaging';
import type { ResolvedStructuredMessage } from 'shared/messaging/registry';
import type { ConversationMessage } from 'dashboard/conversation/types';

import { t } from '../../../../i18n';
import { useOptionalConversation } from '../../../conversation/ConversationContext';

const DEGRADED_LEVELS = ['text_numbered', 'text', 'image_text'] as const;
type DegradedLevel = (typeof DEGRADED_LEVELS)[number];

// Nút chỉ nhân viên thấy, đứng ngoài kit (kit ở chế độ chỉ xem, không tự ghi gì).
function MarkBankTransferPaidButton({ message }: { message: ConversationMessage }) {
    const conversation = useOptionalConversation();
    const [isSubmitting, setSubmitting] = useState(false);

    if (!conversation) return null;

    const onClick = async () => {
        setSubmitting(true);
        try {
            await conversation.markBankTransferPaid(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <button
            type="button"
            className="flex items-center gap-1 self-start rounded px-2 py-1 text-xs text-n-slate-11 hover:bg-n-alpha-1 hover:text-n-slate-12 disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => void onClick()}
        >
            <span className="i-lucide-check-check size-3.5 flex-none" />
            {t('CONVERSATION.STRUCTURED.MARK_BANK_TRANSFER_PAID')}
        </button>
    );
}

/**
 * Tin có cấu trúc trong hộp thư: vẽ bằng chính message kit của widget ở chế độ chỉ xem,
 * trong khung "khách thấy thế này". Kênh không có dạng gốc thì ghi chú khách thật sự
 * nhận gì (mức hạ cấp do DeliveryPlanner ghi ở `content_attributes.delivery`).
 */
export default function StructuredBubble({ resolved, message }: { resolved: ResolvedStructuredMessage; message: StructuredMessage }) {
    const delivery = message.content_attributes?.delivery;
    const degraded = DEGRADED_LEVELS.includes(delivery as DegradedLevel) ? (delivery as DegradedLevel) : null;
    const bankTransfer =
        resolved.definition.contentType === 'bank_transfer' ? (resolved.model as { paidAt?: string }) : null;

    return (
        <div className="flex min-w-0 max-w-[360px] flex-col gap-1.5">
            <div className="rounded-2xl border border-n-weak bg-n-alpha-1 p-2">
                {resolved.definition.content === 'host' && message.content ? (
                    <p className="m-0 whitespace-pre-wrap break-words px-1.5 pb-2 pt-0.5 text-sm text-n-slate-12">{message.content}</p>
                ) : null}
                <StructuredMessageView resolved={resolved} message={message} />
            </div>
            {bankTransfer && !bankTransfer.paidAt ? (
                <MarkBankTransferPaidButton message={message as unknown as ConversationMessage} />
            ) : null}
            {degraded ? (
                <span className="flex items-center gap-1 text-xs text-n-slate-11">
                    <span className="i-lucide-info size-3.5 flex-none" />
                    {t(`CONVERSATION.STRUCTURED.DELIVERY.${degraded.toUpperCase()}`)}
                </span>
            ) : null}
        </div>
    );
}

/** Nhãn nhỏ trên tin khách trả lời một lựa chọn (gõ số, bấm chip trên kênh khác): bấm để cuộn tới câu hỏi. */
export function ChoiceOfLabel({ question, onJump }: { question: { id: number; content: string | null }; onJump?: (messageId: number) => void }) {
    return (
        <button
            type="button"
            className="flex max-w-[260px] items-center gap-1 text-xs text-n-slate-11 hover:text-n-slate-12"
            onClick={() => onJump?.(question.id)}
        >
            <span className="i-lucide-corner-down-right size-3.5 flex-none" />
            <span className="truncate">{t('CONVERSATION.STRUCTURED.CHOICE_OF', { question: question.content ?? '' })}</span>
        </button>
    );
}
