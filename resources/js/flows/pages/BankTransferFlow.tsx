import { useState } from 'react';

import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { formatMoney } from 'shared/messaging/money';
import { Check, Copy } from 'shared/messaging/kit/icons';

import { t } from '../../i18n';
import type { FlowPageProps } from '../registry';

// Trang "bank_transfer": QR lớn + chép tay, dành cho kênh không phải widget
// (link Zalo/SMS). Dữ liệu do nhân viên/bot ghi trong `data`, không bảng ngân hàng riêng.
function CopyRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await copyTextToClipboard(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // Không có Clipboard API (http, trình duyệt cũ) — khách tự bôi đen chép tay.
        }
    };

    return (
        <div className="flow-copy-row">
            <span className="mk-stack">
                <span className="mk-meta">{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
            </span>
            <button type="button" className="mk-pill mk-pill--soft mk-pill--icon" aria-label={t('FLOWS.bank_transfer.copy')} onClick={() => void copy()}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
        </div>
    );
}

export default function BankTransferFlow({ flow }: FlowPageProps) {
    const data = flow.data;
    const qrUrl = typeof data.qr_url === 'string' ? data.qr_url : null;
    const bankName = typeof data.bank_name === 'string' ? data.bank_name : null;
    const accountNumber = typeof data.account_number === 'string' ? data.account_number : null;
    const accountName = typeof data.account_name === 'string' ? data.account_name : null;
    const amount = typeof data.amount === 'number' ? data.amount : null;
    const currency = typeof data.currency === 'string' ? data.currency : 'VND';
    const note = typeof data.note === 'string' ? data.note : null;
    const instructions = typeof data.instructions === 'string' ? data.instructions : null;

    return (
        <div className="flow-body">
            {qrUrl ? (
                <div className="flow-qr">
                    <img src={qrUrl} alt={bankName ?? t('FLOWS.bank_transfer.bank_name')} />
                </div>
            ) : null}
            {bankName ? <CopyRow label={t('FLOWS.bank_transfer.bank_name')} value={bankName} /> : null}
            {accountNumber ? <CopyRow label={t('FLOWS.bank_transfer.account_number')} value={accountNumber} /> : null}
            {accountName ? <CopyRow label={t('FLOWS.bank_transfer.account_name')} value={accountName} /> : null}
            {amount !== null ? <CopyRow label={t('FLOWS.bank_transfer.amount')} value={formatMoney(amount, currency)} /> : null}
            {note ? <CopyRow label={t('FLOWS.bank_transfer.transfer_note')} value={note} /> : null}
            {instructions ? (
                <div className="flow-section">
                    <span className="flow-section-title">{t('FLOWS.bank_transfer.instructions')}</span>
                    <p className="flow-note">{instructions}</p>
                </div>
            ) : null}
        </div>
    );
}
