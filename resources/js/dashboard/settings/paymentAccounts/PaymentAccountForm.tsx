import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import Switch from 'dashboard/components-next/switch/Switch';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import type { ComboBoxOption } from 'dashboard/components-next/combobox/ComboBox';
import { bankLogoUrl } from 'shared/banks/bankLogo';
import { isAccountNumberValid, isPaymentAccountFormValid, normalizeAccountName } from './validations';
import type { BankOption, PaymentAccountFormValues } from './types';

const DEFAULT_MEMO_TEMPLATE = 'CK nhanh qua Yona';

export const emptyPaymentAccountValues = (): PaymentAccountFormValues => ({
    bank_bin: '',
    account_number: '',
    account_name: '',
    memo_template: DEFAULT_MEMO_TEMPLATE,
    is_default: false,
    allow_all_agents: true,
});

interface PaymentAccountFormProps {
    banks: BankOption[];
    headerTitle: string;
    submitLabel: string;
    initialValues: PaymentAccountFormValues;
    isSubmitting: boolean;
    onSubmit: (values: PaymentAccountFormValues) => void;
    onChangeLive?: (values: PaymentAccountFormValues) => void;
    onCancel?: () => void;
    /** Nằm trong <form> của Dialog: không render form riêng, Enter lưu tài khoản thay vì gửi Dialog. */
    embedded?: boolean;
}

export default function PaymentAccountForm({
    banks,
    headerTitle,
    submitLabel,
    initialValues,
    isSubmitting,
    onSubmit,
    onChangeLive,
    onCancel,
    embedded = false,
}: PaymentAccountFormProps) {
    const [values, setValues] = useState<PaymentAccountFormValues>(initialValues);
    const [accountNumberTouched, setAccountNumberTouched] = useState(false);

    const bankOptions: ComboBoxOption[] = banks.map(bank => ({ value: bank.bin, label: `${bank.code} · ${bank.short_name}`, imageUrl: bankLogoUrl(bank.bin) }));
    const accountNumberError = accountNumberTouched && values.account_number !== '' && !isAccountNumberValid(values.account_number)
        ? t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.INVALID')
        : '';

    const update = (patch: Partial<PaymentAccountFormValues>) => {
        const next = { ...values, ...patch };
        setValues(next);
        onChangeLive?.(next);
    };

    const canSubmit = isPaymentAccountFormValid(values) && !isSubmitting;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(values);
    };

    const submitOnEnter = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        if (canSubmit) onSubmit(values);
    };

    const Root = embedded ? 'div' : 'form';
    const rootProps = embedded ? { onKeyDown: submitOnEnter } : { onSubmit: submit };

    return (
        <Root className="flex flex-col gap-4" {...rootProps}>
            <h3 className="m-0 text-base font-medium text-n-slate-12">{headerTitle}</h3>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-n-slate-11">{t('PAYMENT_ACCOUNTS.FORM.BANK.LABEL')}</label>
                <ComboBox
                    options={bankOptions}
                    value={values.bank_bin}
                    placeholder={t('PAYMENT_ACCOUNTS.FORM.BANK.PLACEHOLDER')}
                    searchPlaceholder={t('PAYMENT_ACCOUNTS.FORM.BANK.SEARCH_PLACEHOLDER')}
                    emptyState={t('PAYMENT_ACCOUNTS.FORM.BANK.EMPTY')}
                    onChange={value => update({ bank_bin: value })}
                />
            </div>

            <Input
                label={t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.LABEL')}
                placeholder={t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.PLACEHOLDER')}
                value={values.account_number}
                messageType={accountNumberError ? 'error' : 'info'}
                message={accountNumberError}
                inputMode="numeric"
                onChange={event => update({ account_number: event.target.value.replace(/\s+/g, '') })}
                onBlur={() => setAccountNumberTouched(true)}
            />

            <Input
                label={t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NAME.LABEL')}
                placeholder={t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NAME.PLACEHOLDER')}
                message={t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NAME.HINT')}
                value={values.account_name}
                onChange={event => update({ account_name: event.target.value })}
                onBlur={() => update({ account_name: normalizeAccountName(values.account_name) })}
            />

            <Input
                label={t('PAYMENT_ACCOUNTS.FORM.MEMO_TEMPLATE.LABEL')}
                placeholder={DEFAULT_MEMO_TEMPLATE}
                message={t('PAYMENT_ACCOUNTS.FORM.MEMO_TEMPLATE.HINT')}
                value={values.memo_template}
                onChange={event => update({ memo_template: event.target.value })}
            />

            <div className="flex items-center justify-between">
                <label className="text-sm text-n-slate-11">{t('PAYMENT_ACCOUNTS.FORM.IS_DEFAULT.LABEL')}</label>
                <Switch value={values.is_default} ariaLabel={t('PAYMENT_ACCOUNTS.FORM.IS_DEFAULT.LABEL')} onChange={value => update({ is_default: value })} />
            </div>

            <div className="flex items-center justify-between">
                <label className="text-sm text-n-slate-11">{t('PAYMENT_ACCOUNTS.FORM.ALLOW_ALL_AGENTS.LABEL')}</label>
                <Switch
                    value={values.allow_all_agents}
                    ariaLabel={t('PAYMENT_ACCOUNTS.FORM.ALLOW_ALL_AGENTS.LABEL')}
                    onChange={value => update({ allow_all_agents: value })}
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                {onCancel ? <Button type="button" faded slate label={t('PAYMENT_ACCOUNTS.FORM.CANCEL')} onClick={onCancel} /> : null}
                <Button
                    type={embedded ? 'button' : 'submit'}
                    data-testid="payment-account-submit"
                    label={submitLabel}
                    disabled={!canSubmit}
                    isLoading={isSubmitting}
                    onClick={embedded ? () => onSubmit(values) : undefined}
                />
            </div>
        </Root>
    );
}
