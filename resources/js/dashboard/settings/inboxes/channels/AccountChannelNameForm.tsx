import { useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import Button from 'dashboard/components-next/button/Button';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

interface AccountChannelNameFormProps {
    channelType: string;
    i18nPrefix: string;
}

// Bước đầu của kênh gắn với một tài khoản cá nhân (Zalo, Messenger): tên hộp thư không bắt
// buộc, để trống thì hộp thư lấy tên tài khoản sau khi đăng nhập. Bước đăng nhập có URL
// riêng (settings/inboxes/new/{id}/{channelType}) để F5 hay quay lại không tạo thêm hộp thư.
export default function AccountChannelNameForm({ channelType, i18nPrefix }: AccountChannelNameFormProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [channelName, setChannelName] = useState('');
    const [isCreating, setCreating] = useState(false);

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setCreating(true);
        try {
            const inbox = await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes`, {
                ...(channelName.trim() ? { name: channelName.trim() } : {}),
                channel: { type: channelType },
            });
            router.visit(accountScopedUrl(accountId, `settings/inboxes/new/${inbox.id}/${channelType}`));
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || t(`${i18nPrefix}.API.ERROR_MESSAGE`));
        }
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader headerTitle={t(`${i18nPrefix}.TITLE`)} headerContent={t(`${i18nPrefix}.DESC`)} />
            <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void createChannel(event)}>
                <div className="flex-shrink-0 flex-grow-0">
                    <label>
                        {t(`${i18nPrefix}.CHANNEL_NAME.LABEL`)}
                        <input
                            type="text"
                            value={channelName}
                            placeholder={t(`${i18nPrefix}.CHANNEL_NAME.PLACEHOLDER`)}
                            onChange={event => setChannelName(event.target.value)}
                        />
                        <span className="text-xs text-n-slate-11">{t('INBOX_MGMT.ACCOUNT_CHANNEL.NAME_HINT')}</span>
                    </label>
                </div>

                <div className="w-full mt-4">
                    <Button type="submit" isLoading={isCreating} solid blue label={t(`${i18nPrefix}.SUBMIT_BUTTON`)} />
                </div>
            </form>
        </div>
    );
}
