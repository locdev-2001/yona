import { useState } from 'react';

import { t } from '../../../../i18n';
import BaseAttachmentBubble from './BaseAttachment';
import { useMessageContext } from '../provider';

// Mở rộng của Yona (xem ZaloBusinessCard). Thao tác CRM hay dùng nhất trên thẻ
// ngân hàng là chép số tài khoản — đặt đúng vào chỗ `action` của BaseAttachment.

export interface ZaloBankCard {
    bank_name?: string | null;
    bank_bin?: string | null;
    account_number?: string | null;
    account_holder?: string | null;
    logo_url?: string | null;
    qr_url?: string | null;
}

export default function ZaloBankCardBubble() {
    const { contentAttributes } = useMessageContext();
    const card = (contentAttributes.bank_card ?? {}) as ZaloBankCard;
    const [copied, setCopied] = useState(false);

    const accountNumber = card.account_number?.trim() ?? '';
    const bankName = card.bank_name?.trim() || t('CONVERSATION.ZALO.BANK_CARD.FALLBACK_NAME');

    const copyAccountNumber = () => {
        if (!accountNumber) return;
        navigator.clipboard
            ?.writeText(accountNumber)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => {});
    };

    return (
        <BaseAttachmentBubble
            icon="i-lucide-landmark"
            iconBgColor="bg-[#0068FF]"
            senderTranslationKey="CONVERSATION.SHARED_ATTACHMENT.BANK_CARD"
            content=""
            action={
                accountNumber
                    ? {
                          label: copied
                              ? t('CONVERSATION.ZALO.BANK_CARD.COPIED')
                              : t('CONVERSATION.ZALO.BANK_CARD.COPY_ACCOUNT_NUMBER'),
                          onClick: copyAccountNumber,
                      }
                    : null
            }
            iconSlot={
                card.logo_url ? (
                    <img
                        src={card.logo_url}
                        alt=""
                        loading="lazy"
                        className="size-8 rounded-lg bg-white object-contain p-0.5"
                    />
                ) : undefined
            }
        >
            <div className="space-y-1 overflow-hidden">
                <div className="truncate text-sm text-n-slate-12">{bankName}</div>
                {accountNumber ? (
                    <div className="truncate font-mono text-sm tracking-wider text-n-slate-12">{accountNumber}</div>
                ) : null}
                {card.account_holder ? (
                    <div className="truncate text-sm text-n-slate-11">{card.account_holder}</div>
                ) : null}
                {card.qr_url ? (
                    <a href={card.qr_url} rel="noreferrer noopener nofollow" target="_blank" className="block pt-1">
                        <img
                            src={card.qr_url}
                            alt=""
                            loading="lazy"
                            className="size-20 rounded-md bg-white object-contain"
                            data-testid="zalo-bank-card-qr"
                        />
                    </a>
                ) : null}
            </div>
        </BaseAttachmentBubble>
    );
}
