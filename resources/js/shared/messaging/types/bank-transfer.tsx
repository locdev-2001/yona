import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

import { useMessageHost } from '../host';
import type { Price, StructuredMessage } from '../model';
import { formatMoney } from '../money';
import { price, text } from '../parse';
import { defineMessageType } from '../registry';
import { Check, Copy, Landmark } from '../kit/icons';
import { KitRoot, kt } from '../kit/primitives';

interface BankTransferModel {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount?: Price;
    memo?: string;
    qrPayload: string;
    paidAt?: string;
}

// Vẽ QR ở client từ chuỗi EMVCo server đã dựng sẵn — một nguồn sự thật duy
// nhất cho payload, kit chỉ lo hiển thị.
function QrImage({ payload }: { payload: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        QRCode.toDataURL(payload, { margin: 1, width: 220 })
            .then(url => {
                if (active) setSrc(url);
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [payload]);

    if (!src) return <div className="mk-media" style={{ width: 200, height: 200 }} />;

    return <img src={src} width={200} height={200} alt={kt('bank_transfer_qr_alt')} />;
}

function CopyRow({ label, value, message }: { label: string; value: string; message: StructuredMessage }) {
    const host = useMessageHost();
    const [copied, setCopied] = useState(false);

    const onClick = () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        host.act({ kind: 'copy', label, value }, { message });
    };

    return (
        <span className="mk-summary-row">
            {label}: <b>{value}</b>
            {host.interactive ? (
                <button type="button" className="mk-pill mk-pill--soft mk-pill--icon" aria-label={kt('copy', { label })} onClick={onClick}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            ) : null}
        </span>
    );
}

function BankTransferView({ model, message }: { model: BankTransferModel; message: StructuredMessage }) {
    return (
        <KitRoot>
            <div className="mk-card mk-pad">
                <div className="mk-row">
                    <span className={`mk-tile ${model.paidAt ? 'mk-tile--good' : 'mk-tile--accent'}`}>{model.paidAt ? <Check /> : <Landmark />}</span>
                    <span className="mk-stack">
                        <span className="mk-title">{kt('bank_transfer_title')}</span>
                        {model.paidAt ? <span className="mk-meta">{kt('paid')}</span> : null}
                    </span>
                </div>
                <div className="mk-row" style={{ justifyContent: 'center' }}>
                    <QrImage payload={model.qrPayload} />
                </div>
                <div className="mk-summary">
                    <span className="mk-summary-row">
                        {kt('bank')}: <b>{model.bankName}</b>
                    </span>
                    <CopyRow label={kt('account_number')} value={model.accountNumber} message={message} />
                    <span className="mk-summary-row">
                        {kt('account_holder')}: <b>{model.accountName}</b>
                    </span>
                    {model.amount ? (
                        <span className="mk-summary-row">
                            {kt('transfer_amount')}: <b>{formatMoney(model.amount.amount, model.amount.currency)}</b>
                        </span>
                    ) : null}
                    {model.memo ? <CopyRow label={kt('transfer_memo')} value={model.memo} message={message} /> : null}
                </div>
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
