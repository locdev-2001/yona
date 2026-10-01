import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { BRAND_ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../../types';
import './twitter.scss';

// Port từ settings/inbox/channels/Twitter.vue.
export default function TwitterChannelForm() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const [isRequestingAuthorization, setRequestingAuthorization] = useState(false);

    const requestAuthorization = async (event: FormEvent) => {
        event.preventDefault();
        try {
            setRequestingAuthorization(true);
            const response = await getJson<{ url: string }>(
                `/api/v1/accounts/${accountId}/twitter/authorization`,
            );
            window.location.href = response.url;
        } catch {
            useAlert(t('INBOX_MGMT.ADD.TWITTER.ERROR_MESSAGE'));
        } finally {
            setRequestingAuthorization(false);
        }
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <div className="login-init h-full text-center">
                <form onSubmit={event => void requestAuthorization(event)}>
                    <Button
                        type="submit"
                        icon={BRAND_ICONS.x}
                        label="Sign in with Twitter"
                        isLoading={isRequestingAuthorization}
                    />
                </form>
                <p>{t('INBOX_MGMT.ADD.TWITTER.HELP')}</p>
            </div>
        </div>
    );
}
