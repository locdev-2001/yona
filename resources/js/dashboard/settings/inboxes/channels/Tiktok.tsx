import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../../types';

// Port từ settings/inbox/channels/Tiktok.vue — nút đăng nhập TikTok rồi nhảy
// sang URL uỷ quyền do server trả về. Banner cảnh báo Bắc Mỹ chỉ hiện trên
// Chatwoot Cloud nên không port.
export default function TiktokChannelForm() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [hasError, setHasError] = useState(false);
    const [errorStateMessage, setErrorStateMessage] = useState('');
    const [errorStateDescription, setErrorStateDescription] = useState('');
    const [isRequestingAuthorization, setRequestingAuthorization] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const errorCode = urlParams.get('code');
        const errorMessage = urlParams.get('error_message');

        if (errorMessage) {
            setHasError(true);
            if (errorCode === '400') {
                setErrorStateMessage(errorMessage);
                setErrorStateDescription(t('INBOX_MGMT.ADD.TIKTOK.ERROR_AUTH'));
            } else {
                setErrorStateMessage(t('INBOX_MGMT.ADD.TIKTOK.ERROR_MESSAGE'));
                setErrorStateDescription(errorMessage);
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }, []);

    const requestAuthorization = async () => {
        setRequestingAuthorization(true);
        try {
            const response = await postJson<{ url: string }>(
                `/api/v1/accounts/${accountId}/tiktok/authorization`,
                {},
            );
            window.location.href = response.url;
        } catch (error) {
            setRequestingAuthorization(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.TIKTOK.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="h-full p-6 w-full max-w-full flex-shrink-0 flex-grow-0">
            <div className="flex flex-col items-center justify-start h-full text-center">
                {hasError ? (
                    <div className="max-w-lg mx-auto text-center">
                        <h5>{errorStateMessage}</h5>
                        {errorStateDescription ? <p>{errorStateDescription}</p> : null}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full px-8 py-10 text-center rounded-2xl outline outline-1 outline-n-weak">
                        <div className="flex flex-col items-center w-full max-w-2xl">
                            <h6 className="text-2xl font-medium">
                                {t('INBOX_MGMT.ADD.TIKTOK.CONNECT_YOUR_TIKTOK_PROFILE')}
                            </h6>
                            <p className="max-w-xl py-6 text-sm text-n-slate-11">{t('INBOX_MGMT.ADD.TIKTOK.HELP')}</p>
                            <Button
                                className="text-white !rounded-full !px-6 bg-gradient-to-r from-[#00f2ea] via-[#ff0050] to-[#000000]"
                                lg
                                icon="i-ri-tiktok-line"
                                disabled={isRequestingAuthorization}
                                isLoading={isRequestingAuthorization}
                                label={t('INBOX_MGMT.ADD.TIKTOK.CONTINUE_WITH_TIKTOK')}
                                onClick={() => void requestAuthorization()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
