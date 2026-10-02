import { useState } from 'react';

import { bankLogoUrl } from '../../banks/bankLogo';
import StyledQr from '../../qr/StyledQr';
import { useMessageHost } from '../host';
import type { Price, StructuredMessage } from '../model';
import { formatMoney } from '../money';
import { price, text } from '../parse';
import { defineMessageType } from '../registry';
import { Check, Copy, Landmark } from '../kit/icons';
import { KitRoot, kt } from '../kit/primitives';

interface BankTransferModel {
    bankName: string;
    bankBin?: string;
    accountNumber: string;
    accountName: string;
    amount?: Price;
    memo?: string;
    qrPayload: string;
    paidAt?: string;
}

/** Nhãn nằm trên giá trị: thẻ hẹp nên giá trị dài (tên chủ tài khoản, nội dung) có trọn bề ngang. */
function BankRow({ label, value, copyable = false, message }: { label: string; value: string; copyable?: boolean; message: StructuredMessage }) {
    const host = useMessageHost();
    const [copied, setCopied] = useState(false);

    const onClick = () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        host.act({ kind: 'copy', label, value }, { message });
    };

    return (
        <div className="mk-bank-row">
            <dt className="mk-bank-label">{label}</dt>
            <dd className="mk-bank-value">{value}</dd>
            {copyable && host.interactive ? (
                <button type="button" className="mk-pill mk-pill--soft mk-pill--icon mk-bank-action" aria-label={kt('copy', { label })} onClick={onClick}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            ) : null}
        </div>
    );
}

function BankBadge({ bankBin }: { bankBin?: string }) {
    const [failed, setFailed] = useState(false);
    const logoUrl = bankLogoUrl(bankBin);

    if (!logoUrl || failed) {
        return (
            <span className="mk-tile mk-tile--accent">
                <Landmark />
            </span>
        );
    }

    return (
        <span className="mk-bank-logo">
            <img src={logoUrl} alt="" onError={() => setFailed(true)} />
        </span>
    );
}

function BankTransferView({ model, message }: { model: BankTransferModel; message: StructuredMessage }) {
    const host = useMessageHost();

    return (
        <KitRoot>
            <div className="mk-card mk-pad">
                <div className="mk-row">
                    <BankBadge bankBin={model.bankBin} />
                    <span className="mk-stack">
                        <span className="mk-title">{kt('bank_transfer_title')}</span>
                        {model.paidAt ? (
                            <span className="mk-meta mk-meta--good">
                                <Check size={14} />
                                {kt('paid')}
                            </span>
                        ) : null}
                    </span>
                </div>
                <dl className="mk-bank">
                    <BankRow label={kt('bank')} value={model.bankName} message={message} />
                    <BankRow label={kt('account_number')} value={model.accountNumber} copyable message={message} />
                    <BankRow label={kt('account_holder')} value={model.accountName} message={message} />
                    {model.amount ? (
                        <BankRow label={kt('transfer_amount')} value={formatMoney(model.amount.amount, model.amount.currency)} message={message} />
                    ) : null}
                    {model.memo ? <BankRow label={kt('transfer_memo')} value={model.memo} copyable message={message} /> : null}
                </dl>
                <details className="mk-bank-qr" open={!host.interactive}>
                    <summary>{kt('show_qr')}</summary>
                    <div className="mk-row" style={{ justifyContent: 'center', paddingTop: 8 }}>
                        <StyledQr payload={model.qrPayload} size={220} bankBin={model.bankBin} ariaLabel={kt('bank_transfer_qr_alt')} />
                    </div>
                </details>
            </div>
        </KitRoot>
    );
}

export default defineMessageType<BankTransferModel>({
    contentType: 'bank_transfer',
    content: 'view',
    side: 'agent',
    parse: attributes => {
        const bankName = text(attributes.bank_name);
        const accountNumber = text(attributes.account_number);
        const accountName = text(attributes.account_name);
        const qrPayload = text(attributes.qr_payload);

        if (!bankName || !accountNumber || !accountName || !qrPayload) return null;

        return {
            bankName,
            bankBin: text(attributes.bank_bin),
            accountNumber,
            accountName,
            qrPayload,
            amount: price(attributes.amount),
            memo: text(attributes.memo),
            paidAt: text(attributes.paid_at),
        };
    },
    View: BankTransferView,
});
