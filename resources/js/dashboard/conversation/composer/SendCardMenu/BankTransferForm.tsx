import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import PaymentAccountForm, { emptyPaymentAccountValues } from 'dashboard/settings/paymentAccounts/PaymentAccountForm';
import { createPaymentAccount, fetchBanks } from 'dashboard/settings/paymentAccounts/paymentAccountsApi';
import type { BankOption, PaymentAccountFormValues } from 'dashboard/settings/paymentAccounts/types';
import { isAccountNumberValid, normalizeAccountName } from 'dashboard/settings/paymentAccounts/validations';
import type { DashboardPageProps } from 'dashboard/types';
import { bankLogoUrl } from 'shared/banks/bankLogo';

import { t } from '../../../../i18n';
import {
    bankTransferPreviewAttributes,
    defaultMemo,
    parseAmount,
    type BankTransferDraft,
    type PaymentAccountOption,
    type StructuredDraft,
} from './cardPayloads';

const k = (key: string) => t(`CONVERSATION.SEND_CARD.BANK_TRANSFER.${key}`);
const PREVIEW_DEBOUNCE_MS = 250;
const PENDING_ACCOUNT_NAME = '…';

/** Tài khoản đang nhập dở, đủ ngân hàng và số tài khoản hợp lệ thì mới xem trước được. */
function draftAccountOption(values: PaymentAccountFormValues, banks: BankOption[]): PaymentAccountOption | null {
    const bank = banks.find(item => item.bin === values.bank_bin);
    if (!bank || !isAccountNumberValid(values.account_number)) return null;

    return {
        id: 0,
        bank_bin: bank.bin,
        bank_code: bank.code,
        bank_name: bank.short_name,
        account_number: values.account_number,
        account_name: normalizeAccountName(values.account_name) || PENDING_ACCOUNT_NAME,
        memo_template: values.memo_template,
        is_default: values.is_default,
    };
}

/** Quản trị viên thêm tài khoản nhận tiền ngay trong dialog, tạo xong thì chọn luôn. */
function NewPaymentAccount({
    accountId,
    conversationDisplayId,
    amount,
    onCreated,
    onCancel,
    onPreview,
}: {
    accountId: number;
    conversationDisplayId: number;
    amount: number | null;
    onCreated: (account: PaymentAccountOption) => void;
    onCancel?: () => void;
    onPreview: (preview: StructuredDraft | null) => void;
}) {
    const [banks, setBanks] = useState<BankOption[]>([]);
    const [values, setValues] = useState<PaymentAccountFormValues>(emptyPaymentAccountValues);
    const [isSubmitting, setSubmitting] = useState(false);
    const draft = draftAccountOption(values, banks);
    const memo = defaultMemo(draft ?? undefined, conversationDisplayId);

    useEffect(() => {
        let alive = true;
        fetchBanks(accountId)
            .then(payload => alive && setBanks(payload))
            .catch(() => alive && setBanks([]));

        return () => {
            alive = false;
        };
    }, [accountId]);

    useEffect(() => {
        if (!draft) {
            onPreview(null);
            return undefined;
        }

        const query = new URLSearchParams({
            bank_bin: draft.bank_bin,
            account_number: draft.account_number,
            ...(amount ? { amount: String(amount) } : {}),
            ...(memo ? { memo } : {}),
        });
        const timer = setTimeout(() => {
            getJson<{ qr_payload: string }>(`/api/v1/accounts/${accountId}/payment_accounts/preview?${query}`)
                .then(({ qr_payload: qrPayload }) =>
                    onPreview({ contentType: 'bank_transfer', contentAttributes: bankTransferPreviewAttributes(draft, qrPayload, amount, memo) }),
                )
                .catch(() => onPreview(null));
        }, PREVIEW_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, draft?.bank_bin, draft?.account_number, draft?.account_name, memo, amount]);

    const create = async (values: PaymentAccountFormValues) => {
        setSubmitting(true);
        try {
            onCreated(await createPaymentAccount(accountId, values));
            useAlert(t('PAYMENT_ACCOUNTS.ADD.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PAYMENT_ACCOUNTS.ADD.ERROR'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PaymentAccountForm
            embedded
            banks={banks}
            headerTitle={k('NEW_ACCOUNT_TITLE')}
            submitLabel={t('PAYMENT_ACCOUNTS.FORM.CREATE')}
            initialValues={values}
            isSubmitting={isSubmitting}
            onChangeLive={setValues}
            onSubmit={create}
            onCancel={onCancel}
        />
    );
}

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
    const canManageAccounts = usePage<DashboardPageProps>().props.currentAccountUser?.role === 'administrator';
    const [accounts, setAccounts] = useState<PaymentAccountOption[] | null>(null);
    const [isCreating, setCreating] = useState(false);
    const [accountBeforeCreating, setAccountBeforeCreating] = useState<PaymentAccountOption>();
    const selected = accounts?.find(account => account.id === draft.paymentAccountId);

    const selectAccount = (account: PaymentAccountOption | undefined) =>
        onChange({ ...draft, paymentAccountId: account?.id ?? null, memo: defaultMemo(account, conversationDisplayId) });

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
        if (isCreating) return undefined;
        if (!selected) {
            onPreview(null);
            return undefined;
        }

        const amount = parseAmount(draft.amount);
        const query = new URLSearchParams({ ...(amount ? { amount: String(amount) } : {}), ...(draft.memo.trim() ? { memo: draft.memo.trim() } : {}) });
        const timer = setTimeout(() => {
            getJson<{ qr_payload: string }>(`/api/v1/accounts/${accountId}/payment_accounts/${selected.id}/preview?${query}`)
                .then(({ qr_payload: qrPayload }) =>
                    onPreview({ contentType: 'bank_transfer', contentAttributes: bankTransferPreviewAttributes(selected, qrPayload, amount, draft.memo) }),
                )
                .catch(() => onPreview(null));
        }, PREVIEW_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, selected?.id, draft.amount, draft.memo, isCreating]);

    const hasNoAccounts = accounts !== null && accounts.length === 0;

    // Đang tạo thì bỏ chọn tài khoản cũ: nút Gửi không được gửi thẻ khác với bản xem trước.
    const startCreating = () => {
        setAccountBeforeCreating(selected);
        setCreating(true);
        onChange({ ...draft, paymentAccountId: null });
    };

    const cancelCreating = () => {
        setCreating(false);
        selectAccount(accountBeforeCreating);
    };

    const onCreated = (account: PaymentAccountOption) => {
        setAccounts(current => [...(current ?? []), account]);
        setCreating(false);
        selectAccount(account);
    };

    if (hasNoAccounts && !canManageAccounts) {
        return <p className="m-0 text-sm text-n-slate-11">{k('NO_ACCOUNTS')}</p>;
    }

    if (isCreating || hasNoAccounts) {
        return (
            <NewPaymentAccount
                accountId={accountId}
                conversationDisplayId={conversationDisplayId}
                amount={parseAmount(draft.amount)}
                onCreated={onCreated}
                onCancel={hasNoAccounts ? undefined : cancelCreating}
                onPreview={onPreview}
            />
        );
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
                        imageUrl: bankLogoUrl(account.bank_bin),
                    }))}
                    placeholder={k('ACCOUNT')}
                    action={canManageAccounts ? { label: k('ADD_ACCOUNT'), onSelect: startCreating } : undefined}
                    onChange={value => selectAccount(accounts?.find(item => String(item.id) === value))}
                />
            </div>
            <Input label={k('AMOUNT')} inputMode="numeric" placeholder={k('AMOUNT_PLACEHOLDER')} value={draft.amount} onChange={event => onChange({ ...draft, amount: event.target.value })} />
            <Input label={k('MEMO')} maxLength={100} value={draft.memo} onChange={event => onChange({ ...draft, memo: event.target.value })} />
            <p className="m-0 text-xs text-n-slate-11">{k('MEMO_HINT')}</p>
        </div>
    );
}
