import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import ColorPicker from 'dashboard/components-next/colorpicker/ColorPicker';
import Input from 'dashboard/components-next/input/Input';
import { deletePortalLogo, portalUiFlagsIn, useHelpCenterState } from '../store';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalBaseSettings.vue.
// Khác biệt cố ý (lệnh founder): KHÔNG có ô slug.
const MAXIMUM_FILE_UPLOAD_SIZE = 4; // MB

interface PortalBaseSettingsProps {
    activePortal: Portal;
    isFetching?: boolean;
    onUpdatePortal: (portal: Record<string, unknown>) => void;
}

interface BaseSettingsState {
    name: string;
    headerText: string;
    pageTitle: string;
    widgetColor: string;
    homePageLink: string;
    logoUrl: string;
    avatarBlobId: string | number;
}

const stateFromPortal = (portal: Portal): BaseSettingsState => ({
    name: portal.name ?? '',
    headerText: portal.header_text ?? '',
    pageTitle: portal.page_title ?? '',
    widgetColor: portal.color ?? '',
    homePageLink: portal.homepage_link ?? '',
    logoUrl: portal.logo?.file_url ?? '',
    avatarBlobId: portal.logo?.blob_id ?? '',
});

const isValidUrl = (value: string): boolean => {
    if (!value) return true;
    try {
        return Boolean(new URL(value));
    } catch {
        return false;
    }
};

export default function PortalBaseSettings({ activePortal, isFetching = false, onUpdatePortal }: PortalBaseSettingsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    useHelpCenterState();

    const [state, setState] = useState<BaseSettingsState>(() => stateFromPortal(activePortal));
    const [originalState, setOriginalState] = useState<BaseSettingsState>(() => stateFromPortal(activePortal));

    useEffect(() => {
        if (isFetching) return;

        const next = stateFromPortal(activePortal);
        setState(next);
        setOriginalState(next);
    }, [activePortal, isFetching]);

    const isUpdatingPortal = Boolean(portalUiFlagsIn(activePortal?.slug).isUpdating);
    const hasChanges = useMemo(() => JSON.stringify(state) !== JSON.stringify(originalState), [state, originalState]);

    const nameError = state.name.trim().length >= 2 ? '' : t('HELP_CENTER.CREATE_PORTAL_DIALOG.NAME.ERROR');
    const homePageLinkError = isValidUrl(state.homePageLink)
        ? ''
        : t('HELP_CENTER.PORTAL_SETTINGS.FORM.HOME_PAGE_LINK.ERROR');

    const set = (patch: Partial<BaseSettingsState>) => setState(current => ({ ...current, ...patch }));

    const handleAvatarUpload = async ({ file }: { file: File }) => {
        if (file.size / (1024 * 1024) > MAXIMUM_FILE_UPLOAD_SIZE) {
            useAlert(
                t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_SIZE_ERROR', {
                    size: MAXIMUM_FILE_UPLOAD_SIZE,
                }),
            );

            return;
        }

        try {
            const { fileUrl, blobId } = await uploadFile(file, accountId);
            if (fileUrl) set({ logoUrl: fileUrl, avatarBlobId: blobId ?? '' });
            useAlert(t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_SUCCESS'));
        } catch {
            useAlert(t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_UPLOAD_ERROR'));
        }
    };

    const handleAvatarDelete = async () => {
        set({ logoUrl: '', avatarBlobId: '' });
        try {
            await deletePortalLogo(accountId, activePortal?.slug);
            useAlert(t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_DELETE_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.IMAGE_DELETE_ERROR'));
        }
    };

    const labelClass = 'text-sm font-medium whitespace-nowrap py-2.5 text-n-slate-12';
    const rowClass = 'grid items-start justify-between w-full gap-2 grid-cols-[200px,1fr]';

    return (
        <div className="flex flex-col w-full gap-4">
            <div className="flex flex-col w-full gap-2">
                <label className="mb-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">
                    {t('HELP_CENTER.PORTAL_SETTINGS.FORM.AVATAR.LABEL')}
                </label>
                <Avatar
                    src={state.logoUrl}
                    name={state.name}
                    size={72}
                    allowUpload
                    iconName="i-lucide-building-2"
                    onUpload={handleAvatarUpload}
                    onDelete={handleAvatarDelete}
                />
            </div>
            <div className="flex flex-col w-full gap-4">
                <div className={rowClass}>
                    <label className={labelClass}>{t('HELP_CENTER.PORTAL_SETTINGS.FORM.NAME.LABEL')}</label>
                    <Input
                        value={state.name}
                        placeholder={t('HELP_CENTER.PORTAL_SETTINGS.FORM.NAME.PLACEHOLDER')}
                        messageType={nameError ? 'error' : 'info'}
                        message={nameError}
                        customInputClass="!bg-transparent dark:!bg-transparent"
                        onChange={event => set({ name: event.target.value })}
                    />
                </div>
                <div className={rowClass}>
                    <label className={labelClass}>{t('HELP_CENTER.PORTAL_SETTINGS.FORM.HEADER_TEXT.LABEL')}</label>
                    <Input
                        value={state.headerText}
                        placeholder={t('HELP_CENTER.PORTAL_SETTINGS.FORM.HEADER_TEXT.PLACEHOLDER')}
                        customInputClass="!bg-transparent dark:!bg-transparent"
                        onChange={event => set({ headerText: event.target.value })}
                    />
                </div>
                <div className={rowClass}>
                    <label className={labelClass}>{t('HELP_CENTER.PORTAL_SETTINGS.FORM.PAGE_TITLE.LABEL')}</label>
                    <Input
                        value={state.pageTitle}
                        placeholder={t('HELP_CENTER.PORTAL_SETTINGS.FORM.PAGE_TITLE.PLACEHOLDER')}
                        customInputClass="!bg-transparent dark:!bg-transparent"
                        onChange={event => set({ pageTitle: event.target.value })}
                    />
                </div>
                <div className={rowClass}>
                    <label className={labelClass}>{t('HELP_CENTER.PORTAL_SETTINGS.FORM.HOME_PAGE_LINK.LABEL')}</label>
                    <Input
                        value={state.homePageLink}
                        placeholder={t('HELP_CENTER.PORTAL_SETTINGS.FORM.HOME_PAGE_LINK.PLACEHOLDER')}
                        messageType={homePageLinkError ? 'error' : 'info'}
                        message={homePageLinkError}
                        customInputClass="!bg-transparent dark:!bg-transparent"
                        onChange={event => set({ homePageLink: event.target.value })}
                    />
                </div>
                <div className={rowClass}>
                    <label className={labelClass}>{t('HELP_CENTER.PORTAL_SETTINGS.FORM.BRAND_COLOR.LABEL')}</label>
                    <div className="w-[432px] justify-start">
                        <ColorPicker value={state.widgetColor} onChange={hex => set({ widgetColor: hex })} />
                    </div>
                </div>
                <div className="flex justify-end w-full gap-2">
                    <Button
                        label={t('HELP_CENTER.PORTAL_SETTINGS.FORM.SAVE_CHANGES')}
                        disabled={!hasChanges || isUpdatingPortal || Boolean(nameError) || Boolean(homePageLinkError)}
                        isLoading={isUpdatingPortal}
                        onClick={() =>
                            onUpdatePortal({
                                id: activePortal?.id,
                                name: state.name,
                                color: state.widgetColor,
                                page_title: state.pageTitle,
                                header_text: state.headerText,
                                homepage_link: state.homePageLink,
                                blob_id: state.avatarBlobId,
                            })
                        }
                    />
                </div>
            </div>
        </div>
    );
}
