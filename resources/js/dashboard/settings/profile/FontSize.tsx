import { fontSizeOptions } from 'dashboard/composables/useFontSize';
import FormSelect from 'v3/components/Form/Select';

// Port từ dashboard/routes/dashboard/settings/profile/FontSize.vue
interface FontSizeProps {
    value: string;
    label: string;
    description: string;
    onChange: (value: string) => void;
}

export default function FontSize({ value, label, description, onChange }: FontSizeProps) {
    return (
        <div className="flex gap-2 justify-between w-full items-start">
            <div>
                <label className="text-n-gray-12 font-medium leading-6 text-sm">{label}</label>
                <p className="text-n-gray-11">{description}</p>
            </div>
            <FormSelect
                name="fontSize"
                className="min-w-28 mt-px"
                value={value}
                options={fontSizeOptions()}
                onChange={onChange}
            />
        </div>
    );
}
