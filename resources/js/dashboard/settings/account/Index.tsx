import { useEffect, useState } from 'react';
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

const LOCALE_SELECT_ID = 'account-locale';
// Đổi ngôn ngữ phải tải lại trang (bundle chữ nạp lúc khởi động); cờ này giữ thông báo
// thành công qua lần tải lại để nó hiện ra, bằng chính ngôn ngữ mới.
const LOCALE_SAVED_FLAG = 'yona:account-locale-saved';

const takeLocaleSavedFlag = (): boolean => {
    try {
        const wasSaved = window.sessionStorage.getItem(LOCALE_SAVED_FLAG) !== null;
        window.sessionStorage.removeItem(LOCALE_SAVED_FLAG);
        return wasSaved;
    } catch {
        return false;
    }
};

const markLocaleSaved = (): void => {
    try {
        window.sessionStorage.setItem(LOCALE_SAVED_FLAG, '1');
    } catch {
        // Trình duyệt chặn sessionStorage: chỉ mất thông báo, ngôn ngữ vẫn đã lưu.
    }
};

// Cài đặt chung của tài khoản. Ngôn ngữ account là ngôn ngữ mặc định của widget
// website và của dashboard (người dùng tự chọn ngôn ngữ riêng thì thắng).
export default function AccountSettingsIndex() {
    const { currentAccount, availableLocales } = usePage<AccountSettingsPageProps>().props;
    const [locale, setLocale] = useState(currentAccount.locale);
    const [isSaving, setSaving] = useState(false);

    useEffect(() => {
        if (takeLocaleSavedFlag()) useAlert(t('GENERAL_SETTINGS.LANGUAGE.UPDATE_SUCCESS'));
    }, []);

    const updateLocale = async (nextLocale: string) => {
        const previousLocale = locale;
        setLocale(nextLocale);
        setSaving(true);
        try {
            await patchJson(`/api/v1/accounts/${currentAccount.id}`, { locale: nextLocale });
            markLocaleSaved();
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
                        title={<label htmlFor={LOCALE_SELECT_ID}>{t('GENERAL_SETTINGS.LANGUAGE.TITLE')}</label>}
                        description={t('GENERAL_SETTINGS.LANGUAGE.NOTE')}
                    >
                        <FormSelect
                            id={LOCALE_SELECT_ID}
                            name={LOCALE_SELECT_ID}
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
