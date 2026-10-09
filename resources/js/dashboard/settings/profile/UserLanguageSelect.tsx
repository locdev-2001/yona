import { t } from '../../../i18n';
import FormSelect from 'v3/components/Form/Select';
import { useInterfaceLocale } from 'dashboard/composables/useInterfaceLocale';

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
        <div className="flex gap-2 justify-between w-full items-start">
            <div>
                <label className="text-n-gray-12 font-medium leading-6 text-sm">{label}</label>
                <p className="text-n-gray-11">{description}</p>
            </div>
            <FormSelect name="language" className="min-w-28 mt-px" value={value} options={options} onChange={onChange} />
        </div>
    );
}
