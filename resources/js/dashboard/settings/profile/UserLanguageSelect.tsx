import { t } from '../../../i18n';
import { useInterfaceLocale } from 'dashboard/composables/useInterfaceLocale';
import SettingSelectRow from './SettingSelectRow';

// Danh sách ngôn ngữ lấy đúng các ngôn ngữ máy chủ bật (globalConfig.availableLocales),
// lựa chọn lưu vào ui_settings.locale; rỗng = theo ngôn ngữ của tài khoản.
interface UserLanguageSelectProps {
    label: string;
    description: string;
    value: string;
    onChange: (locale: string) => void;
}

export default function UserLanguageSelect({ label, description, value, onChange }: UserLanguageSelectProps) {
    const { availableLocales } = useInterfaceLocale();
    const options = [
        {
            value: '',
            label: t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.USE_ACCOUNT_DEFAULT'),
        },
        ...availableLocales.map(language => ({ value: language.iso_639_1_code, label: language.name })),
    ];

    return (
        <SettingSelectRow
            name="language"
            label={label}
            description={description}
            value={value}
            options={options}
            onChange={onChange}
        />
    );
}
