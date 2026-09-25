import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Button from 'dashboard/components-next/button/Button';
import ColorPicker from 'dashboard/components/widgets/ColorPicker';
import Editor from 'dashboard/components-next/Editor/Editor';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import GreetingsEditor from 'shared/components/GreetingsEditor';
import SettingsSubPageHeader from '../../SettingsSubPageHeader';
import { buildWebsiteChannelPayload } from '../webWidgetHelpers';
import type { DashboardPageProps } from '../../../types';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { Inbox } from '../types';

// Port từ settings/inbox/channels/Website.vue — bước 2 của wizard cho kênh Website.
export default function WebsiteChannelForm() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;

    const [inboxName, setInboxName] = useState('');
    const [channelWidgetColor, setChannelWidgetColor] = useState('#009CE0');
    const [channelWelcomeTitle, setChannelWelcomeTitle] = useState('');
    const [channelWelcomeTagline, setChannelWelcomeTagline] = useState('');
    const [greetingEnabled, setGreetingEnabled] = useState(false);
    const [greetingMessage, setGreetingMessage] = useState('');
    const [isCreating, setCreating] = useState(false);

    const createChannel = async (event: FormEvent) => {
        event.preventDefault();
        setCreating(true);

        try {
            const inbox = await postJson<Inbox>(
                `/api/v1/accounts/${accountId}/inboxes`,
                buildWebsiteChannelPayload({
                    inboxName,
                    channelWidgetColor,
                    channelWelcomeTitle,
                    channelWelcomeTagline,
                    greetingEnabled,
                    greetingMessage,
                }),
            );
            window.location.replace(
                accountScopedUrl(accountId, `settings/inboxes/new/${inbox.id}/agents`),
            );
        } catch (error) {
            setCreating(false);
            useAlert(
                parseApiErrorMessage(error) || t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.API.ERROR_MESSAGE'),
            );
        }
    };

    return (
        <div className="h-full w-full p-6 col-span-6">
            <SettingsSubPageHeader
                headerTitle={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.TITLE')}
                headerContent={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.DESC')}
            />
            {isCreating ? (
                <LoadingState message={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.LOADING_MESSAGE')} />
            ) : (
                <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void createChannel(event)}>
                    <div className="w-full">
                        <label>
                            {t('INBOX_MGMT.ADD.WEBSITE_NAME.LABEL')}
                            <input
                                type="text"
                                value={inboxName}
                                placeholder={t('INBOX_MGMT.ADD.WEBSITE_NAME.PLACEHOLDER')}
                                onChange={event => setInboxName(event.target.value)}
                            />
                        </label>
                    </div>

                    <div className="w-full">
                        <label>
                            {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.WIDGET_COLOR.LABEL')}
                            <ColorPicker value={channelWidgetColor} onChange={setChannelWidgetColor} />
                        </label>
                    </div>

                    <div className="w-full">
                        <label>
                            {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.LABEL')}
                            <input
                                type="text"
                                value={channelWelcomeTitle}
                                placeholder={t(
                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.PLACEHOLDER',
                                )}
                                onChange={event => setChannelWelcomeTitle(event.target.value)}
                            />
                        </label>
                    </div>
                    <Editor
                        value={channelWelcomeTagline}
                        onChange={setChannelWelcomeTagline}
                        uiSettings={uiSettings}
                        label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.LABEL')}
                        placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.PLACEHOLDER')}
                        maxLength={255}
                        className="mb-4"
                    />

                    <label className="w-full">
                        {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.LABEL')}
                        <select
                            value={greetingEnabled ? 'true' : 'false'}
                            onChange={event => setGreetingEnabled(event.target.value === 'true')}
                        >
                            <option value="true">
                                {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.ENABLED')}
                            </option>
                            <option value="false">
                                {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.DISABLED')}
                            </option>
                        </select>
                        <p className="help-text">
                            {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.HELP_TEXT')}
                        </p>
                    </label>
                    {greetingEnabled ? (
                        <GreetingsEditor
                            value={greetingMessage}
                            onChange={setGreetingMessage}
                            className="w-full"
                            label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.LABEL')}
                            placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.PLACEHOLDER')}
                        />
                    ) : null}
                    <div className="flex flex-row justify-end w-full gap-2 px-0 py-2 mt-4">
                        <div className="w-full">
                            <Button
                                type="submit"
                                isLoading={isCreating}
                                disabled={!inboxName}
                                solid
                                blue
                                label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.SUBMIT_BUTTON')}
                            />
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}
