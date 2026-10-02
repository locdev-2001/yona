import { getJson, postJson } from 'dashboard/helper/apiClient';

import type { BankOption, PaymentAccount, PaymentAccountFormValues } from './types';

const paymentAccountsUrl = (accountId: number) => `/api/v1/accounts/${accountId}/payment_accounts`;

export const fetchBanks = (accountId: number): Promise<BankOption[]> =>
    getJson<{ payload: BankOption[] }>(`${paymentAccountsUrl(accountId)}/banks`).then(({ payload }) => payload);

export const createPaymentAccount = (accountId: number, values: PaymentAccountFormValues): Promise<PaymentAccount> =>
    postJson<PaymentAccount>(paymentAccountsUrl(accountId), { ...values });
