import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import { bankLogoUrl } from 'shared/banks/bankLogo';
import PaymentAccountForm, { emptyPaymentAccountValues } from './PaymentAccountForm';
import QrPreviewCard from './QrPreviewCard';
import { createPaymentAccount, fetchBanks } from './paymentAccountsApi';
import type { BankOption, PaymentAccount, PaymentAccountFormValues } from './types';
import type { DashboardPageProps } from '../../types';

const valuesOf = (account: PaymentAccount): PaymentAccountFormValues => ({
    bank_bin: account.bank_bin,
    account_number: account.account_number,
    account_name: account.account_name,
    memo_template: account.memo_template ?? '',
    is_default: account.is_default,
    allow_all_agents: account.allow_all_agents,
});

export default function PaymentAccountsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [banks, setBanks] = useState<BankOption[]>([]);
    const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
    const [isLoading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState<PaymentAccount | null>(null);

    useEffect(() => {
        let active = true;

        Promise.all([
            fetchBanks(accountId),
            getJson<{ payload: PaymentAccount[] }>(`/api/v1/accounts/${accountId}/payment_accounts`),
        ])
            .then(([bankResponse, accountResponse]) => {
                if (!active) return;
                setBanks(bankResponse);
                setAccounts(accountResponse.payload);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const editingAccount = typeof editingId === 'number' ? accounts.find(account => account.id === editingId) ?? null : null;
    const previewAccount = editingAccount ?? accounts.find(account => account.is_default) ?? accounts[0] ?? null;

    const create = async (values: PaymentAccountFormValues) => {
        setSubmitting(true);
        try {
            const created = await createPaymentAccount(accountId, values);
            setAccounts(current => [...current, created]);
            setEditingId(null);
            useAlert(t('PAYMENT_ACCOUNTS.ADD.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PAYMENT_ACCOUNTS.ADD.ERROR'));
        } finally {
            setSubmitting(false);
        }
    };

    const update = async (id: number, values: PaymentAccountFormValues) => {
        setSubmitting(true);
        try {
            const updated = await patchJson<PaymentAccount>(`/api/v1/accounts/${accountId}/payment_accounts/${id}`, { ...values });
            setAccounts(current => current.map(account => (account.id === id ? updated : account)));
            setEditingId(null);
            useAlert(t('PAYMENT_ACCOUNTS.EDIT.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PAYMENT_ACCOUNTS.EDIT.ERROR'));
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        const account = deletingAccount;
        if (!account) return;

        setDeletingAccount(null);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/payment_accounts/${account.id}`);
            setAccounts(current => current.filter(item => item.id !== account.id));
            if (editingId === account.id) setEditingId(null);
            useAlert(t('PAYMENT_ACCOUNTS.DELETE.SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PAYMENT_ACCOUNTS.DELETE.ERROR'));
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="flex w-full flex-col gap-6">
                <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-6">
                        <BaseSettingsHeader title={t('PAYMENT_ACCOUNTS.HEADER')} description={t('PAYMENT_ACCOUNTS.DESCRIPTION')} />

                        {isLoading ? (
                            <LoadingState message={t('PAYMENT_ACCOUNTS.LOADING')} />
                        ) : (
                            <div className="panel-surface flex flex-col gap-3 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="m-0 text-sm font-medium text-n-slate-11">{t('PAYMENT_ACCOUNTS.LIST.TITLE')}</h3>
                                </div>

                                {accounts.length === 0 ? (
                                    <p className="m-0 text-sm text-n-slate-10">{t('PAYMENT_ACCOUNTS.LIST.EMPTY')}</p>
                                ) : (
                                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                        {accounts.map(account => (
                                            <li
                                                key={account.id}
                                                className={`flex items-center justify-between gap-3 rounded-lg p-3 ${
                                                    editingId === account.id ? 'bg-n-surface-selected' : 'hover:bg-n-surface-hover'
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-8 w-16 flex-none items-center justify-center rounded bg-white px-1.5">
                                                        <img src={bankLogoUrl(account.bank_bin)} alt={account.bank_name} className="max-h-5 max-w-full object-contain" />
                                                    </span>
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate text-sm font-medium text-n-slate-12">
                                                            {account.bank_name} · {account.account_number}
                                                        </span>
                                                        <span className="truncate text-xs text-n-slate-10">{account.account_name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-none items-center gap-2">
                                                    {account.is_default ? (
                                                        <span className="rounded bg-n-teal-3 px-2 py-0.5 text-xs font-medium text-n-teal-11">
                                                            {t('PAYMENT_ACCOUNTS.LIST.DEFAULT_BADGE')}
                                                        </span>
                                                    ) : null}
                                                    <Button
                                                        title={t('PAYMENT_ACCOUNTS.FORM.EDIT')}
                                                        icon="i-lucide-pencil"
                                                        slate
                                                        sm
                                                        onClick={() => setEditingId(account.id)}
                                                    />
                                                    <Button
                                                        title={t('PAYMENT_ACCOUNTS.FORM.DELETE')}
                                                        icon="i-lucide-trash-2"
                                                        slate
                                                        sm
                                                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                        onClick={() => setDeletingAccount(account)}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {editingId === 'new' ? null : (
                                    <Button
                                        link
                                        icon="i-lucide-plus"
                                        label={t('PAYMENT_ACCOUNTS.LIST.ADD')}
                                        onClick={() => setEditingId('new')}
                                    />
                                )}
                            </div>
                        )}

                        {editingId !== null ? (
                            <div className="panel-surface rounded-xl p-4">
                                <PaymentAccountForm
                                    banks={banks}
                                    headerTitle={editingAccount ? t('PAYMENT_ACCOUNTS.EDIT.TITLE') : t('PAYMENT_ACCOUNTS.ADD.TITLE')}
                                    submitLabel={editingAccount ? t('PAYMENT_ACCOUNTS.FORM.SAVE') : t('PAYMENT_ACCOUNTS.FORM.CREATE')}
                                    initialValues={editingAccount ? valuesOf(editingAccount) : emptyPaymentAccountValues()}
                                    isSubmitting={isSubmitting}
                                    onCancel={() => setEditingId(null)}
                                    onSubmit={values => void (editingAccount ? update(editingAccount.id, values) : create(values))}
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="w-full flex-none lg:w-80">
                        <QrPreviewCard accountId={accountId} paymentAccount={previewAccount} />
                    </div>
                </div>

                <DeleteModal
                    show={deletingAccount !== null}
                    onClose={() => setDeletingAccount(null)}
                    onConfirm={() => void confirmDelete()}
                    title={t('PAYMENT_ACCOUNTS.DELETE.CONFIRM.TITLE')}
                    message={t('PAYMENT_ACCOUNTS.DELETE.CONFIRM.MESSAGE')}
                    messageValue={deletingAccount ? ` ${deletingAccount.bank_name} · ${deletingAccount.account_number}?` : ''}
                    confirmText={t('PAYMENT_ACCOUNTS.DELETE.CONFIRM.YES')}
                    rejectText={t('PAYMENT_ACCOUNTS.DELETE.CONFIRM.NO')}
                />
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
