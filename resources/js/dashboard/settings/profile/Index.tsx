import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useBranding } from 'shared/composables/useBranding';
import { useAlert } from 'dashboard/composables/useAlert';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import { applyFontSizeToDOM, DEFAULT_FONT_SIZE } from 'dashboard/composables/useFontSize';
import { deleteJson, parseApiErrorMessage, putForm, putJson } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SectionLayout from '../account/SectionLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import RadioCard from 'dashboard/components-next/radioCard/RadioCard';
import UserProfilePicture from './UserProfilePicture';
import UserBasicDetails from './UserBasicDetails';
import MessageSignature from './MessageSignature';
import ChangePassword from './ChangePassword';
import NotificationPreferences from './NotificationPreferences';
import FontSize from './FontSize';
import UserLanguageSelect from './UserLanguageSelect';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/profile/Index.vue —
// MFA (F8) / Active sessions (F8) / Audio alerts (chờ tệp âm thanh) /
// Access token (F8) vào theo roadmap; các section còn lại đủ.
const HOT_KEYS = [
    {
        key: 'enter' as const,
        titleKey: 'PROFILE_SETTINGS.FORM.SEND_MESSAGE.CARD.ENTER_KEY.HEADING',
        descriptionKey: 'PROFILE_SETTINGS.FORM.SEND_MESSAGE.CARD.ENTER_KEY.CONTENT',
        lightImage: '/assets/images/dashboard/profile/hot-key-enter.svg',
        darkImage: '/assets/images/dashboard/profile/hot-key-enter-dark.svg',
    },
    {
        key: 'cmd_enter' as const,
        titleKey: 'PROFILE_SETTINGS.FORM.SEND_MESSAGE.CARD.CMD_ENTER_KEY.HEADING',
        descriptionKey: 'PROFILE_SETTINGS.FORM.SEND_MESSAGE.CARD.CMD_ENTER_KEY.CONTENT',
        lightImage: '/assets/images/dashboard/profile/hot-key-ctrl-enter.svg',
        darkImage: '/assets/images/dashboard/profile/hot-key-ctrl-enter-dark.svg',
    },
];

interface ProfilePayload {
    avatar_url: string;
    ui_settings: UISettings;
}

export default function ProfileSettingsIndex() {
    const { auth } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const { replaceInstallationName } = useBranding();

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
    const [name, setName] = useState(user.name);
    const [displayName, setDisplayName] = useState(user.display_name ?? '');
    const [email, setEmail] = useState(user.email);
    const [messageSignature, setMessageSignature] = useState(user.message_signature ?? '');
    const [uiSettings, setUiSettings] = useState<UISettings>(user.ui_settings ?? {});

    const updateUISettings = async (settings: UISettings) => {
        const merged = { ...uiSettings, ...settings };
        setUiSettings(merged);
        await putJson('/api/v1/profile', { ui_settings: settings });
    };

    const updateProfile = async ({
        name: newName,
        displayName: newDisplayName,
        email: newEmail,
    }: {
        name: string;
        displayName: string;
        email: string;
    }) => {
        const hasEmailChanged = user.email !== newEmail.toLowerCase();
        setName(newName);
        setDisplayName(newDisplayName);
        setEmail(newEmail);

        let alertMessage = hasEmailChanged
            ? t('PROFILE_SETTINGS.AFTER_EMAIL_CHANGED')
            : t('PROFILE_SETTINGS.UPDATE_SUCCESS');
        let success = true;
        try {
            const form = new FormData();
            form.set('name', newName);
            form.set('display_name', newDisplayName);
            form.set('email', newEmail);
            if (avatarFile) form.set('avatar', avatarFile);
            const profile = await putForm<ProfilePayload>('/api/v1/profile', form);
            setAvatarUrl(profile.avatar_url);
            setAvatarFile(null);
        } catch (error) {
            success = false;
            alertMessage = parseApiErrorMessage(error) || t('RESET_PASSWORD.API.ERROR_MESSAGE');
        }
        useAlert(alertMessage);

        // Gốc: đổi email → clearCookiesOnLogout (đăng nhập lại bằng email mới sau xác nhận).
        if (hasEmailChanged && success) {
            router.post('/app/logout');
        } else if (success) {
            // Store gốc cập nhật currentUser sau updateProfile → sidebar thấy avatar/tên mới ngay.
            router.reload({ only: ['auth'] });
        }
    };

    const updateSignature = async (signature: string) => {
        setMessageSignature(signature);
        let alertMessage = t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.API_SUCCESS');
        try {
            await putJson('/api/v1/profile', { message_signature: signature });
        } catch (error) {
            alertMessage =
                parseApiErrorMessage(error) || t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.API_ERROR');
        }
        useAlert(alertMessage);
    };

    const updateProfilePicture = ({ file, url }: { file: File; url: string | null }) => {
        setAvatarFile(file);
        if (url) setAvatarUrl(url);
    };

    const deleteProfilePicture = async () => {
        try {
            await deleteJson('/api/v1/profile/avatar');
            setAvatarUrl('');
            setAvatarFile(null);
            useAlert(t('PROFILE_SETTINGS.AVATAR_DELETE_SUCCESS'));
            router.reload({ only: ['auth'] });
        } catch {
            useAlert(t('PROFILE_SETTINGS.AVATAR_DELETE_FAILED'));
        }
    };

    const toggleHotKey = async (key: string) => {
        await updateUISettings({ editor_message_key: key });
        useAlert(t('PROFILE_SETTINGS.FORM.SEND_MESSAGE.UPDATE_SUCCESS'));
    };

    const updateFontSize = async (pixelValue: string) => {
        try {
            await updateUISettings({ font_size: pixelValue });
            applyFontSizeToDOM(pixelValue);
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.FONT_SIZE.UPDATE_SUCCESS'));
        } catch {
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.FONT_SIZE.UPDATE_ERROR'));
        }
    };

    const updateLanguage = async (locale: string) => {
        try {
            await updateUISettings({ locale: locale || null });
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_SUCCESS'));
        } catch {
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_ERROR'));
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="grid max-w-2xl ltr:mr-auto rtl:ml-auto">
                    <BaseSettingsHeader title={t('PROFILE_SETTINGS.TITLE')} />
                    <SectionLayout className="!pt-0">
                        <div className="flex flex-col gap-6">
                            <UserProfilePicture
                                src={avatarUrl}
                                name={name}
                                onChange={updateProfilePicture}
                                onDelete={() => void deleteProfilePicture()}
                            />
                            <UserBasicDetails
                                name={name}
                                displayName={displayName}
                                email={email}
                                emailEnabled
                                onUpdateUser={payload => void updateProfile(payload)}
                            />
                        </div>
                    </SectionLayout>
                    <SectionLayout
                        withBorder
                        title={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.TITLE')}
                        description={replaceInstallationName(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.NOTE'))}
                    >
                        <div className="flex flex-col gap-6 items-start">
                            <FontSize
                                value={(uiSettings.font_size as string) || DEFAULT_FONT_SIZE}
                                label={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.FONT_SIZE.TITLE')}
                                description={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.FONT_SIZE.NOTE')}
                                onChange={value => void updateFontSize(value)}
                            />
                            <UserLanguageSelect
                                label={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.TITLE')}
                                description={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.NOTE')}
                                value={(uiSettings.locale as string) ?? ''}
                                onChange={locale => void updateLanguage(locale)}
                            />
                        </div>
                    </SectionLayout>
                    <SectionLayout
                        withBorder
                        title={t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.TITLE')}
                        description={t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.NOTE')}
                    >
                        <MessageSignature
                            messageSignature={messageSignature}
                            onUpdateSignature={signature => void updateSignature(signature)}
                        />
                    </SectionLayout>
                    <SectionLayout
                        withBorder
                        title={t('PROFILE_SETTINGS.FORM.SEND_MESSAGE.TITLE')}
                        description={t('PROFILE_SETTINGS.FORM.SEND_MESSAGE.NOTE')}
                    >
                        <div className="flex flex-col justify-between w-full gap-5 sm:gap-4 sm:flex-row">
                            {HOT_KEYS.map(hotKey => (
                                <RadioCard
                                    key={hotKey.key}
                                    id={hotKey.key}
                                    label={t(hotKey.titleKey)}
                                    description={t(hotKey.descriptionKey)}
                                    isActive={isEditorHotKeyEnabled(uiSettings, hotKey.key)}
                                    className="sm:flex-1"
                                    onSelect={key => void toggleHotKey(key)}
                                >
                                    <img
                                        src={hotKey.lightImage}
                                        alt={`Light themed image for ${t(hotKey.titleKey)}`}
                                        className="block object-cover w-full dark:hidden"
                                    />
                                    <img
                                        src={hotKey.darkImage}
                                        alt={`Dark themed image for ${t(hotKey.titleKey)}`}
                                        className="hidden object-cover w-full dark:block"
                                    />
                                </RadioCard>
                            ))}
                        </div>
                    </SectionLayout>
                    <SectionLayout withBorder title={t('PROFILE_SETTINGS.FORM.PASSWORD_SECTION.TITLE')}>
                        <ChangePassword />
                    </SectionLayout>
                    <SectionLayout withBorder title={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.TITLE')}>
                        <NotificationPreferences />
                    </SectionLayout>
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
