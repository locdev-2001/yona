import { t } from '../../../i18n';
import FormSelect from 'v3/components/Form/Select';

// Port từ dashboard/routes/dashboard/settings/profile/UserLanguageSelect.vue —
// danh sách từ config/initializers/languages.rb (các mục enabled, giữ nguyên
// tên kể cả khoảng trắng thừa của 'nl'); đổi locale runtime vào nhóm G,
// lựa chọn lưu vào ui_settings.locale như gốc.
const ENABLED_LANGUAGES = [
    { name: 'English (en)', iso_639_1_code: 'en' },
    { name: 'العربية (ar)', iso_639_1_code: 'ar' },
    { name: 'Nederlands (nl) ', iso_639_1_code: 'nl' },
    { name: 'Français (fr)', iso_639_1_code: 'fr' },
    { name: 'Deutsch (de)', iso_639_1_code: 'de' },
    { name: 'Italiano (it)', iso_639_1_code: 'it' },
    { name: '日本語 (ja)', iso_639_1_code: 'ja' },
    { name: '한국어 (ko)', iso_639_1_code: 'ko' },
    { name: 'Português (pt)', iso_639_1_code: 'pt' },
    { name: 'русский (ru)', iso_639_1_code: 'ru' },
    { name: 'Español (es)', iso_639_1_code: 'es' },
    { name: 'മലയാളം (ml)', iso_639_1_code: 'ml' },
    { name: 'Català (ca)', iso_639_1_code: 'ca' },
    { name: 'ελληνικά (el)', iso_639_1_code: 'el' },
    { name: 'Português Brasileiro (pt-BR)', iso_639_1_code: 'pt_BR' },
    { name: 'Română (ro)', iso_639_1_code: 'ro' },
    { name: 'தமிழ் (ta)', iso_639_1_code: 'ta' },
    { name: 'فارسی (fa)', iso_639_1_code: 'fa' },
    { name: '中文 (台湾) (zh-TW)', iso_639_1_code: 'zh_TW' },
    { name: 'Tiếng Việt (vi)', iso_639_1_code: 'vi' },
    { name: 'dansk (da)', iso_639_1_code: 'da' },
    { name: 'Türkçe (tr)', iso_639_1_code: 'tr' },
    { name: 'čeština (cs)', iso_639_1_code: 'cs' },
    { name: 'suomi, suomen kieli (fi)', iso_639_1_code: 'fi' },
    { name: 'Bahasa Indonesia (id)', iso_639_1_code: 'id' },
    { name: 'Svenska (sv)', iso_639_1_code: 'sv' },
    { name: 'magyar nyelv (hu)', iso_639_1_code: 'hu' },
    { name: 'norsk (no)', iso_639_1_code: 'no' },
    { name: '中文 (zh-CN)', iso_639_1_code: 'zh_CN' },
    { name: 'język polski (pl)', iso_639_1_code: 'pl' },
    { name: 'slovenčina (sk)', iso_639_1_code: 'sk' },
    { name: 'украї́нська мо́ва (uk)', iso_639_1_code: 'uk' },
    { name: 'ภาษาไทย (th)', iso_639_1_code: 'th' },
    { name: 'latviešu valoda (lv)', iso_639_1_code: 'lv' },
    { name: 'íslenska (is)', iso_639_1_code: 'is' },
    { name: 'עִברִית (he)', iso_639_1_code: 'he' },
    { name: 'lietuvių (lt)', iso_639_1_code: 'lt' },
    { name: 'Српски (sr)', iso_639_1_code: 'sr' },
    { name: 'български (bg)', iso_639_1_code: 'bg' },
    { name: 'Eesti keel (et)', iso_639_1_code: 'et' },
    { name: 'Oʻzbekcha (uz)', iso_639_1_code: 'uz' },
    { name: 'slovenščina (sl)', iso_639_1_code: 'sl' },
];

interface UserLanguageSelectProps {
    label: string;
    description: string;
    value: string;
    onChange: (locale: string) => void;
}

export default function UserLanguageSelect({ label, description, value, onChange }: UserLanguageSelectProps) {
    const options = [
        {
            value: '',
            label: t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.USE_ACCOUNT_DEFAULT'),
        },
        ...ENABLED_LANGUAGES.map(language => ({ value: language.iso_639_1_code, label: language.name })),
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
