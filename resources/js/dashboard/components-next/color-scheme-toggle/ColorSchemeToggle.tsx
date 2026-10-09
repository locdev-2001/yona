import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useColorScheme } from 'dashboard/composables/useColorScheme';
import type { ColorScheme } from 'dashboard/composables/useColorScheme';
import Segmented from 'dashboard/components-next/segmented/Segmented';

const SCHEME_ICONS: Record<ColorScheme, string> = {
    light: 'i-lucide-sun',
    dark: 'i-lucide-moon',
};

// Công tắc Sáng / Tối của portal, dùng ở menu avatar và trang hồ sơ. Gạt là đổi ngay;
// lưu hỏng thì gạt về và báo lỗi.
export default function ColorSchemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
    const { colorScheme, options, changeColorScheme } = useColorScheme();
    const [selected, setSelected] = useState(colorScheme);

    useEffect(() => setSelected(colorScheme), [colorScheme]);

    const select = (value: string) => {
        const scheme = value as ColorScheme;
        if (scheme === selected) return;
        setSelected(scheme);
        changeColorScheme(scheme).catch(() => {
            setSelected(colorScheme);
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.UPDATE_ERROR'));
        });
    };

    return (
        <Segmented
            appearance="pill"
            size={size}
            ariaLabel={t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.TITLE')}
            options={options.map(option => ({ ...option, icon: SCHEME_ICONS[option.value] }))}
            value={selected}
            onChange={select}
        />
    );
}
