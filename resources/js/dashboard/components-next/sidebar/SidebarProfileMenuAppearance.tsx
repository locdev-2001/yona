import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import ColorSchemeToggle from 'dashboard/components-next/color-scheme-toggle/ColorSchemeToggle';
import { DropdownItem } from 'dashboard/components-next/dropdown-menu/base';

// Hàng "Giao diện" trong menu avatar: công tắc Sáng / Tối của riêng mình.
export default function SidebarProfileMenuAppearance() {
    return (
        <DropdownItem preserveOpen className="gap-1">
            <div className="flex-grow flex items-center gap-2 min-w-0">
                <Icon icon="i-lucide-sun-moon" className="size-4 text-n-slate-11" />
                {t('SIDEBAR_ITEMS.APPEARANCE')}
            </div>
            <ColorSchemeToggle size="sm" />
        </DropdownItem>
    );
}
