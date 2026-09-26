import { useEffect, useState } from 'react';

import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Input from 'dashboard/components-next/input/Input';
import { getJson } from 'dashboard/helper/apiClient';

import { t } from '../../../../i18n';
import { defaultMemo, parseAmount, type BankTransferDraft, type PaymentAccountOption, type StructuredDraft } from './cardPayloads';

const k = (key: string) => t(`CONVERSATION.SEND_CARD.BANK_TRANSFER.${key}`);

/**
 * Chọn tài khoản nhận tiền (chỉ những tài khoản người gửi được phép dùng), số tiền, nội dung.
 * Bản xem trước lấy mã QR từ máy chủ, không tự dựng chuỗi VietQR ở trình duyệt.
 */
export default function BankTransferForm({
    accountId,
    conversationDisplayId,
    draft,
    onChange,
    onPreview,
}: {
    accountId: number;
    conversationDisplayId: number;
    draft: BankTransferDraft;
    onChange: (draft: BankTransferDraft) => void;
    onPreview: (preview: StructuredDraft | null) => void;
}) {
    const [accounts, setAccounts] = useState<PaymentAccountOption[] | null>(null);
    const selected = accounts?.find(account => account.id === draft.paymentAccountId);

    useEffect(() => {
        let alive = true;
        getJson<{ payload: PaymentAccountOption[] }>(`/api/v1/accounts/${accountId}/payment_accounts`)
            .then(({ payload }) => {
                if (!alive) return;
                setAccounts(payload);
                const initial = payload.find(account => account.is_default) ?? payload[0];
                if (initial && !draft.paymentAccountId) {
                    onChange({ ...draft, paymentAccountId: initial.id, memo: draft.memo || defaultMemo(initial, conversationDisplayId) });
                }
            })
            .catch(() => alive && setAccounts([]));

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId]);

    useEffect(() => {
        if (!selected) {
            onPreview(null);
            return undefined;
        }

        const amount = parseAmount(draft.amount);
        const query = new URLSearchParams({ ...(amount ? { amount: String(amount) } : {}), ...(draft.memo.trim() ? { memo: draft.memo.trim() } : {}) });
        const timer = setTimeout(() => {
            getJson<{ qr_payload: string }>(`/api/v1/accounts/${accountId}/payment_accounts/${selected.id}/preview?${query}`)
                .then(({ qr_payload: qrPayload }) =>
                    onPreview({
                        contentType: 'bank_transfer',
                        contentAttributes: {
                            bank_name: selected.bank_name,
                            account_number: selected.account_number,
                            account_name: selected.account_name,
                            ...(amount ? { amount: { amount, currency: 'VND' } } : {}),
                            ...(draft.memo.trim() ? { memo: draft.memo.trim() } : {}),
                            qr_payload: qrPayload,
                        },
                    }),
                )
                .catch(() => onPreview(null));
        }, 250);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, selected?.id, draft.amount, draft.memo]);

    if (accounts !== null && accounts.length === 0) {
        return <p className="m-0 text-sm text-n-slate-11">{k('NO_ACCOUNTS')}</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                <span className="mb-0.5 text-sm font-medium text-n-slate-12">{k('ACCOUNT')}</span>
                <ComboBox
                    value={draft.paymentAccountId ? String(draft.paymentAccountId) : ''}
                    options={(accounts ?? []).map(account => ({
                        value: String(account.id),
                        label: `${account.bank_name} · ${account.account_number} · ${account.account_name}`,
                    }))}
                    placeholder={k('ACCOUNT')}
                    onChange={value => {
                        const account = accounts?.find(item => String(item.id) === value);
                        onChange({ ...draft, paymentAccountId: account?.id ?? null, memo: defaultMemo(account, conversationDisplayId) });
                    }}
                />
            </div>
            <Input label={k('AMOUNT')} inputMode="numeric" placeholder={k('AMOUNT_PLACEHOLDER')} value={draft.amount} onChange={event => onChange({ ...draft, amount: event.target.value })} />
            <Input label={k('MEMO')} maxLength={100} value={draft.memo} onChange={event => onChange({ ...draft, memo: event.target.value })} />
            <p className="m-0 text-xs text-n-slate-11">{k('MEMO_HINT')}</p>
        </div>
    );
}
