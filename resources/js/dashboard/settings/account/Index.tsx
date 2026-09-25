import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson } from 'dashboard/helper/apiClient';
import FormSelect from 'v3/components/Form/Select';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import SectionLayout from './SectionLayout';
import type { DashboardPageProps } from '../../types';

interface AvailableLocale {
    name: string;
    iso_639_1_code: string;
}

interface AccountSettingsPageProps extends DashboardPageProps {
    availableLocales: AvailableLocale[];
}

// Cài đặt chung của tài khoản. Ngôn ngữ account là ngôn ngữ mặc định của widget
// website và của dashboard (người dùng tự chọn ngôn ngữ riêng thì thắng).
export default function AccountSettingsIndex() {
    const { currentAccount, availableLocales } = usePage<AccountSettingsPageProps>().props;
    const [locale, setLocale] = useState(currentAccount.locale);
    const [isSaving, setSaving] = useState(false);

    const updateLocale = async (nextLocale: string) => {
        const previousLocale = locale;
        setLocale(nextLocale);
        setSaving(true);
        try {
            await patchJson(`/api/v1/accounts/${currentAccount.id}`, { locale: nextLocale });
            useAlert(t('GENERAL_SETTINGS.LANGUAGE.UPDATE_SUCCESS'));
            // Bundle ngôn ngữ nạp lúc khởi động: nạp lại để giao diện đổi ngữ theo account.
            window.location.reload();
        } catch {
            setLocale(previousLocale);
            useAlert(t('GENERAL_SETTINGS.LANGUAGE.UPDATE_ERROR'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="grid max-w-2xl ltr:mr-auto rtl:ml-auto">
                    <BaseSettingsHeader title={t('GENERAL_SETTINGS.TITLE')} description={t('GENERAL_SETTINGS.DESCRIPTION')} />
                    <SectionLayout
                        title={t('GENERAL_SETTINGS.LANGUAGE.TITLE')}
                        description={t('GENERAL_SETTINGS.LANGUAGE.NOTE')}
                    >
                        <FormSelect
                            id="account-locale"
                            name="account-locale"
                            label={t('GENERAL_SETTINGS.LANGUAGE.TITLE')}
                            className="max-w-xs"
                            value={locale}
                            options={availableLocales.map(option => ({ value: option.iso_639_1_code, label: option.name }))}
                            onChange={nextLocale => {
                                if (!isSaving && nextLocale !== locale) void updateLocale(nextLocale);
                            }}
                        />
                    </SectionLayout>
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
