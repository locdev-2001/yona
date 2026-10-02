import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import StyledQr from '../../../shared/qr/StyledQr';
import type { PaymentAccount } from './types';

interface QrPreviewCardProps {
    accountId: number;
    paymentAccount: PaymentAccount | null;
}

export default function QrPreviewCard({ accountId, paymentAccount }: QrPreviewCardProps) {
    const [qrPayload, setQrPayload] = useState<string | null>(null);

    useEffect(() => {
        if (!paymentAccount) {
            setQrPayload(null);
            return undefined;
        }

        let active = true;

        getJson<{ qr_payload: string }>(`/api/v1/accounts/${accountId}/payment_accounts/${paymentAccount.id}/preview`)
            .then(response => {
                if (active) setQrPayload(response.qr_payload);
            })
            .catch(() => {
                if (active) setQrPayload(null);
            });

        return () => {
            active = false;
        };
    }, [accountId, paymentAccount?.id, paymentAccount?.bank_bin, paymentAccount?.account_number, paymentAccount?.memo_template]);

    return (
        <div className="flex flex-col gap-4 rounded border border-n-weak bg-n-solid-1 p-4">
            <h3 className="m-0 text-sm font-medium text-n-slate-11">{t('PAYMENT_ACCOUNTS.PREVIEW.TITLE')}</h3>
            {!paymentAccount ? (
                <p className="m-0 text-sm text-n-slate-10">{t('PAYMENT_ACCOUNTS.PREVIEW.EMPTY')}</p>
            ) : (
                <div className="flex flex-col items-center gap-3 rounded border border-n-weak bg-n-background p-4">
                    {qrPayload ? (
                        <StyledQr payload={qrPayload} size={180} bankCode={paymentAccount.bank_code} />
                    ) : (
                        <div className="h-[180px] w-[180px] bg-n-slate-3" />
                    )}
                    <div className="flex w-full flex-col gap-1 text-sm">
                        <span className="flex justify-between gap-2">
                            <span className="text-n-slate-10">{t('PAYMENT_ACCOUNTS.PREVIEW.BANK')}</span>
                            <span className="text-n-slate-12">{paymentAccount.bank_name}</span>
                        </span>
                        <span className="flex justify-between gap-2">
                            <span className="text-n-slate-10">{t('PAYMENT_ACCOUNTS.PREVIEW.ACCOUNT_NUMBER')}</span>
                            <span className="text-n-slate-12">{paymentAccount.account_number}</span>
                        </span>
                    </div>
                </div>
            )}
            <p className="m-0 text-xs text-n-slate-10">{t('PAYMENT_ACCOUNTS.PREVIEW.NOTE')}</p>
        </div>
    );
}
