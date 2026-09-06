import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import Button from 'dashboard/components-next/button/Button';
import ZaloQrPanel from './ZaloQrPanel';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Kênh Zalo cá nhân (G1). Không có màn tương ứng bên Chatwoot — bố cục bám đúng
// khuôn hai bước của channels/Api.tsx + Telegram: đặt tên inbox rồi tới bước quét
// mã QR, xong là sang bước gán nhân viên như mọi kênh khác.
export default function ZaloChannelForm() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [channelName, setChannelName] = useState('');
    const [nameTouched, setNameTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);
    const [inboxId, setInboxId] = useState<number | null>(null);

    const nameInvalid = !channelName.trim();

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setNameTouched(true);
        if (nameInvalid) return;

        setCreating(true);
        try {
            const inbox = await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, {
                name: channelName.trim(),
                channel: { type: 'zalo' },
            });
            setInboxId(inbox.id);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.ZALO_CHANNEL.API.ERROR_MESSAGE'));
        } finally {
            setCreating(false);
        }
    };

    if (inboxId !== null) {
        return (
            <div className="h-full w-full p-6 col-span-6">
                <SettingsSubPageHeader
                    headerTitle={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.TITLE')}
                    headerContent={t('INBOX_MGMT.ADD.ZALO_CHANNEL.QR.DESC')}
                />
                <ZaloQrPanel
                    accountId={accountId}
                    inboxId={inboxId}
                    onConnected={() =>
                        window.location.replace(
                            accountScopedUrl(accountId, `settings/inboxes/new/${inboxId}/agents`),
                        )
                    }
                />
            </div>
        );
    }

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.ZALO_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.ZALO_CHANNEL.DESC')}
            />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void createChannel(event)}>
                <div className="flex-shrink-0 flex-grow-0">
                    <label className={nameTouched && nameInvalid ? 'error' : ''}>
                        {t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.LABEL')}
                        <input
                            type="text"
                            value={channelName}
                            placeholder={t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.PLACEHOLDER')}
                            onChange={event => setChannelName(event.target.value)}
                            onBlur={() => setNameTouched(true)}
                        />
                        {nameTouched && nameInvalid ? (
                            <span className="message">{t('INBOX_MGMT.ADD.ZALO_CHANNEL.CHANNEL_NAME.ERROR')}</span>
                        ) : null}
                    </label>
                </div>

                <div className="w-full mt-4">
                    <Button
                        type="submit"
                        isLoading={isCreating}
                        solid
                        blue
                        label={t('INBOX_MGMT.ADD.ZALO_CHANNEL.SUBMIT_BUTTON')}
                    />
                </div>
            </form>
        </div>
    );
}
