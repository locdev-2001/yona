import { fontSizeOptions } from 'dashboard/composables/useFontSize';
import SettingSelectRow from './SettingSelectRow';

// Port từ dashboard/routes/dashboard/settings/profile/FontSize.vue
interface FontSizeProps {
    value: string;
    label: string;
    description: string;
    onChange: (value: string) => void;
}

export default function FontSize(props: FontSizeProps) {
    return <SettingSelectRow name="fontSize" options={fontSizeOptions()} {...props} />;
}
