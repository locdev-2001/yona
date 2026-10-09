import type { ReactNode } from 'react';

import FormSelect from 'v3/components/Form/Select';

// Một hàng thiết lập giao diện ở trang hồ sơ: nhãn + mô tả bên trái, ô điều khiển bên phải.
export function SettingRow({ label, description, children }: { label: string; description: string; children: ReactNode }) {
    return (
        <div className="flex gap-2 justify-between w-full items-start">
            <div>
                <label className="text-n-gray-12 font-medium leading-6 text-sm">{label}</label>
                <p className="text-n-gray-11">{description}</p>
            </div>
            {children}
        </div>
    );
}

interface SettingSelectRowProps {
    name: string;
    label: string;
    description: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

export default function SettingSelectRow({ name, label, description, value, options, onChange }: SettingSelectRowProps) {
    return (
        <SettingRow label={label} description={description}>
            <FormSelect name={name} className="min-w-28 mt-px" value={value} options={options} onChange={onChange} />
        </SettingRow>
    );
}
