import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import {
    createAgentBot,
    deleteAgentBotAvatar,
    resetAgentBotAccessToken,
    resetAgentBotSecret,
    updateAgentBot,
} from 'dashboard/composables/useAgentBots';
import type { AgentBot } from 'dashboard/composables/useAgentBots';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import AccessToken from '../../profile/AccessToken';
import { isUrlInvalid } from 'shared/helpers/Validators';

// Port từ dashboard/routes/dashboard/settings/agentBots/components/AgentBotModal.vue.
export type AgentBotModalType = 'create' | 'edit';

interface AgentBotModalProps {
    accountId: number;
    type: AgentBotModalType;
    selectedBot: AgentBot | null;
}

const AgentBotModal = forwardRef<DialogHandle, AgentBotModalProps>(function AgentBotModal(
    { accountId, type, selectedBot },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const [botName, setBotName] = useState('');
    const [botDescription, setBotDescription] = useState('');
    const [botUrl, setBotUrl] = useState('');
    const [botAvatar, setBotAvatar] = useState<File | null>(null);
    const [botAvatarUrl, setBotAvatarUrl] = useState('');
    const [isNameTouched, setNameTouched] = useState(false);
    const [isUrlTouched, setUrlTouched] = useState(false);
    const [showAccessToken, setShowAccessToken] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [botSecret, setBotSecret] = useState('');
    const [isLoading, setLoading] = useState(false);

    // watch(selectedBot, initializeForm, { immediate: true, deep: true })
    useEffect(() => {
        if (selectedBot) {
            setBotName(selectedBot.name || '');
            setBotDescription(selectedBot.description || '');
            setBotUrl(selectedBot.outgoing_url || selectedBot.bot_config?.webhook_url || '');
            setBotAvatarUrl(selectedBot.thumbnail || '');
            if (type === 'edit') {
                if (selectedBot.access_token) setAccessToken(selectedBot.access_token);
                if (selectedBot.secret) setBotSecret(selectedBot.secret);
            }
        } else {
            setBotName('');
            setBotDescription('');
            setBotUrl('');
            setBotAvatar(null);
            setBotAvatarUrl('');
            setNameTouched(false);
            setUrlTouched(false);
        }
    }, [selectedBot, type]);

    const nameError = !botName.trim() ? t('AGENT_BOTS.FORM.ERRORS.NAME') : '';
    const urlError = !botUrl.trim()
        ? t('AGENT_BOTS.FORM.ERRORS.URL')
        : isUrlInvalid(botUrl)
          ? t('AGENT_BOTS.FORM.ERRORS.VALID_URL')
          : '';
    const isInvalid = Boolean(nameError || urlError);
    const visibleNameError = isNameTouched ? nameError : '';
    const visibleUrlError = isUrlTouched ? urlError : '';

    const closeModal = () => {
        setAccessToken('');
        setBotSecret('');
        setShowAccessToken(false);
    };

    const handleAvatarDelete = async () => {
        if (selectedBot?.id) {
            try {
                await deleteAgentBotAvatar(accountId, selectedBot.id);
                setBotAvatar(null);
                setBotAvatarUrl('');
                useAlert(t('AGENT_BOTS.AVATAR.SUCCESS_DELETE'));
            } catch {
                useAlert(t('AGENT_BOTS.AVATAR.ERROR_DELETE'));
            }
        } else {
            setBotAvatar(null);
            setBotAvatarUrl('');
        }
    };

    const handleSubmit = async () => {
        setNameTouched(true);
        setUrlTouched(true);
        if (isInvalid || showAccessToken) return;

        const isCreate = type === 'create';
        const values = {
            name: botName,
            description: botDescription,
            outgoing_url: botUrl,
            bot_type: 'webhook',
            avatar: botAvatar,
        };

        setLoading(true);
        try {
            const bot =
                isCreate
                    ? await createAgentBot(accountId, values)
                    : await updateAgentBot(accountId, selectedBot!.id, values);

            useAlert(isCreate ? t('AGENT_BOTS.ADD.API.SUCCESS_MESSAGE') : t('AGENT_BOTS.EDIT.API.SUCCESS_MESSAGE'));

            if (isCreate && bot.id && bot.access_token) {
                setAccessToken(bot.access_token);
                setBotSecret(bot.secret || '');
                setShowAccessToken(true);
            } else {
                setAccessToken('');
                setBotSecret('');
                dialogRef.current?.close();
            }
        } catch {
            useAlert(isCreate ? t('AGENT_BOTS.ADD.API.ERROR_MESSAGE') : t('AGENT_BOTS.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setLoading(false);
        }
    };

    const onCopyToken = async (value: string) => {
        await copyTextToClipboard(value);
        useAlert(t('AGENT_BOTS.ACCESS_TOKEN.COPY_SUCCESSFUL'));
    };

    const onCopySecret = async (value: string) => {
        await copyTextToClipboard(value || botSecret);
        useAlert(t('AGENT_BOTS.SECRET.COPY_SUCCESS'));
    };

    const onResetSecret = async () => {
        try {
            const bot = await resetAgentBotSecret(accountId, selectedBot!.id);
            setBotSecret(bot.secret || '');
            useAlert(t('AGENT_BOTS.SECRET.RESET_SUCCESS'));
        } catch {
            useAlert(t('AGENT_BOTS.SECRET.RESET_ERROR'));
        }
    };

    const onResetToken = async () => {
        try {
            const bot = await resetAgentBotAccessToken(accountId, selectedBot!.id);
            setAccessToken(bot.access_token || '');
            useAlert(t('AGENT_BOTS.ACCESS_TOKEN.RESET_SUCCESS'));
        } catch {
            useAlert(t('AGENT_BOTS.ACCESS_TOKEN.RESET_ERROR'));
        }
    };

    const dialogTitle = showAccessToken
        ? t('AGENT_BOTS.ACCESS_TOKEN.TITLE')
        : type === 'create'
          ? t('AGENT_BOTS.ADD.TITLE')
          : t('AGENT_BOTS.EDIT.TITLE');

    const showAccessTokenInput = showAccessToken || type === 'edit' || Boolean(accessToken);

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={dialogTitle}
            description={showAccessToken ? t('AGENT_BOTS.ACCESS_TOKEN.DESCRIPTION') : ''}
            showCancelButton={false}
            showConfirmButton={false}
            onClose={closeModal}
            onConfirm={() => void handleSubmit()}
        >
            <div className="flex flex-col gap-4">
                {!showAccessToken || type === 'edit' ? (
                    <div className="flex flex-col gap-4">
                        <div className="mb-2 flex flex-col items-start">
                            <span className="mb-2 text-sm font-medium text-n-slate-12">
                                {t('AGENT_BOTS.FORM.AVATAR.LABEL')}
                            </span>
                            <Avatar
                                src={botAvatarUrl}
                                name={botName}
                                size={68}
                                allowUpload
                                iconName="i-lucide-bot-message-square"
                                onUpload={({ file, url }) => {
                                    setBotAvatar(file);
                                    setBotAvatarUrl(url ?? '');
                                }}
                                onDelete={() => void handleAvatarDelete()}
                            />
                        </div>

                        <Input
                            id="bot-name"
                            value={botName}
                            label={t('AGENT_BOTS.FORM.NAME.LABEL')}
                            placeholder={t('AGENT_BOTS.FORM.NAME.PLACEHOLDER')}
                            message={visibleNameError}
                            messageType={visibleNameError ? 'error' : 'info'}
                            onChange={event => setBotName(event.target.value)}
                            onBlur={() => setNameTouched(true)}
                        />

                        <TextArea
                            id="bot-description"
                            value={botDescription}
                            label={t('AGENT_BOTS.FORM.DESCRIPTION.LABEL')}
                            placeholder={t('AGENT_BOTS.FORM.DESCRIPTION.PLACEHOLDER')}
                            onChange={value => setBotDescription(value)}
                        />

                        <Input
                            id="bot-url"
                            value={botUrl}
                            label={t('AGENT_BOTS.FORM.WEBHOOK_URL.LABEL')}
                            placeholder={t('AGENT_BOTS.FORM.WEBHOOK_URL.PLACEHOLDER')}
                            message={visibleUrlError}
                            messageType={visibleUrlError ? 'error' : 'info'}
                            onChange={event => setBotUrl(event.target.value)}
                            onBlur={() => setUrlTouched(true)}
                        />
                    </div>
                ) : null}

                {botSecret && type === 'edit' ? (
                    <div className="flex flex-col gap-1">
                        <label className="mb-0.5 text-sm font-medium text-n-slate-12">
                            {t('AGENT_BOTS.SECRET.LABEL')}
                        </label>
                        <AccessToken
                            value={botSecret}
                            onCopy={value => void onCopySecret(value)}
                            onReset={() => void onResetSecret()}
                        />
                    </div>
                ) : null}

                {showAccessTokenInput ? (
                    <div className="flex flex-col gap-1">
                        {type === 'edit' ? (
                            <>
                                <label className="mb-0.5 text-sm font-medium text-n-slate-12">
                                    {t('AGENT_BOTS.ACCESS_TOKEN.TITLE')}
                                </label>
                                <AccessToken
                                    value={accessToken}
                                    onCopy={value => void onCopyToken(value)}
                                    onReset={() => void onResetToken()}
                                />
                            </>
                        ) : (
                            <AccessToken
                                value={accessToken}
                                showResetButton={false}
                                onCopy={value => void onCopyToken(value)}
                            />
                        )}
                    </div>
                ) : null}

                {botSecret && showAccessToken && type === 'create' ? (
                    <div className="flex flex-col gap-1">
                        <p className="text-sm text-n-slate-11">{t('AGENT_BOTS.SECRET.CREATED_DESC')}</p>
                        <label className="mb-0.5 text-sm font-medium text-n-slate-12">
                            {t('AGENT_BOTS.SECRET.LABEL')}
                        </label>
                        <AccessToken
                            value={botSecret}
                            showResetButton={false}
                            onCopy={value => void onCopySecret(value)}
                        />
                    </div>
                ) : null}

                <div className="flex items-center justify-end w-full gap-2 px-0 py-2">
                    <Button
                        faded
                        slate
                        type="reset"
                        label={t('AGENT_BOTS.FORM.CANCEL')}
                        onClick={() => {
                            closeModal();
                            dialogRef.current?.close();
                        }}
                    />
                    {!showAccessToken ? (
                        <Button
                            type="submit"
                            data-testid="label-submit"
                            label={type === 'create' ? t('AGENT_BOTS.FORM.CREATE') : t('AGENT_BOTS.FORM.UPDATE')}
                            isLoading={isLoading}
                            disabled={isInvalid}
                        />
                    ) : null}
                </div>
            </div>
        </Dialog>
    );
});

export default AgentBotModal;
