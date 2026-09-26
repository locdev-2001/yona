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

/** Một dòng nhãn / giá trị / nút chép; lưới 3 cột nên giá trị các dòng thẳng hàng. */
function BankRow({ label, value, copyable = false, message }: { label: string; value: string; copyable?: boolean; message: StructuredMessage }) {
    const host = useMessageHost();
    const [copied, setCopied] = useState(false);

    const onClick = () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        host.act({ kind: 'copy', label, value }, { message });
    };

    return (
        <>
            <dt className="mk-bank-label">{label}</dt>
            <dd className="mk-bank-value">{value}</dd>
            <span className="mk-bank-action">
                {copyable && host.interactive ? (
                    <button type="button" className="mk-pill mk-pill--soft mk-pill--icon" aria-label={kt('copy', { label })} onClick={onClick}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                ) : null}
            </span>
        </>
    );
}

function BankTransferView({ model, message }: { model: BankTransferModel; message: StructuredMessage }) {
    const host = useMessageHost();

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
                <dl className="mk-bank">
                    <BankRow label={kt('bank')} value={model.bankName} message={message} />
                    <BankRow label={kt('account_number')} value={model.accountNumber} copyable message={message} />
                    <BankRow label={kt('account_holder')} value={model.accountName} message={message} />
                    {model.amount ? (
                        <BankRow label={kt('transfer_amount')} value={formatMoney(model.amount.amount, model.amount.currency)} message={message} />
                    ) : null}
                    {model.memo ? <BankRow label={kt('transfer_memo')} value={model.memo} copyable message={message} /> : null}
                </dl>
                {/* Khách đang chat trên chính điện thoại thì không quét được mã trên màn hình mình: số tài khoản
                    và nút chép lên trước, mã QR thu vào một dòng mở ra khi cần. Hộp thư (chỉ xem) mở sẵn. */}
                <details className="mk-bank-qr" open={!host.interactive}>
                    <summary>{kt('show_qr')}</summary>
                    <div className="mk-row" style={{ justifyContent: 'center', paddingTop: 8 }}>
                        <QrImage payload={model.qrPayload} />
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
