import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { BRAND_ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../../types';
import SanitizedHtml from 'shared/components/SanitizedHtml';

// Port từ settings/inbox/channels/Instagram.vue — nút đăng nhập Instagram rồi
// nhảy sang URL uỷ quyền do server trả về. Banner giới hạn của Meta chỉ hiện
// trên bản cloud nên không làm.
export default function InstagramChannelForm() {
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
                setErrorStateDescription(t('INBOX_MGMT.ADD.INSTAGRAM.ERROR_AUTH'));
            } else {
                setErrorStateMessage(t('INBOX_MGMT.ADD.INSTAGRAM.ERROR_MESSAGE'));
                setErrorStateDescription(errorMessage);
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }, []);

    const requestAuthorization = async () => {
        setRequestingAuthorization(true);
        try {
            const response = await postJson<{ url: string }>(
                `/api/v1/accounts/${accountId}/instagram/authorization`,
                {},
            );
            window.location.href = response.url;
        } catch (error) {
            setRequestingAuthorization(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.INSTAGRAM.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="h-full p-6 w-full max-w-full flex-shrink-0 flex-grow-0">
            <div className="flex flex-col items-center justify-start h-full text-center">
                {hasError ? (
                    <div className="max-w-lg mx-auto text-center">
                        <h5>{errorStateMessage}</h5>
                        {errorStateDescription ? <SanitizedHtml as="p" html={errorStateDescription} /> : null}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full px-8 py-10 text-center rounded-2xl outline outline-1 outline-n-weak">
                        <div className="flex flex-col items-center w-full max-w-2xl">
                            <h6 className="text-2xl font-medium">
                                {t('INBOX_MGMT.ADD.INSTAGRAM.CONNECT_YOUR_INSTAGRAM_PROFILE')}
                            </h6>
                            <p className="py-6 text-sm text-n-slate-11">{t('INBOX_MGMT.ADD.INSTAGRAM.HELP')}</p>
                            <Button
                                className="text-white !rounded-full !px-6 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]"
                                lg
                                icon={BRAND_ICONS.instagram}
                                disabled={isRequestingAuthorization}
                                isLoading={isRequestingAuthorization}
                                label={t('INBOX_MGMT.ADD.INSTAGRAM.CONTINUE_WITH_INSTAGRAM')}
                                onClick={() => void requestAuthorization()}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
