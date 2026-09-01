import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import Spinner from 'dashboard/components-next/spinner/Spinner';

// Port từ dashboard/components-next/dropdown-menu/DropdownMenu.vue — nhánh
// menuItems phẳng (menuSections/search nội bộ vào khi màn nào cần).
export interface DropdownMenuItem {
    label: string;
    value: number | string;
    action: string;
    icon?: string;
    disabled?: boolean;
    isSelected?: boolean;
    thumbnail?: { name: string; src: string };
    [key: string]: unknown;
}

interface DropdownMenuProps {
    menuItems: DropdownMenuItem[];
    thumbnailSize?: number;
    isLoading?: boolean;
    className?: string;
    onAction: (item: DropdownMenuItem) => void;
}

export default function DropdownMenu({
    menuItems,
    thumbnailSize = 20,
    isLoading = false,
    className = '',
    onAction,
}: DropdownMenuProps) {
    return (
        <div
            className={`bg-n-alpha-3 backdrop-blur-[100px] border-0 outline outline-1 outline-n-container absolute rounded-xl z-50 flex flex-col min-w-[136px] shadow-lg pt-2 overflow-hidden ${className}`}
        >
            <div className="flex flex-col gap-2 overflow-y-auto min-h-0 px-2 pb-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-2">
                        <Spinner size={24} />
                    </div>
                ) : null}
                {menuItems.map((item, index) => (
                    <button
                        key={`${item.value}-${index}`}
                        type="button"
                        className={[
                            'inline-flex items-center justify-start w-full h-8 min-w-0 gap-2 px-2 py-1.5 transition-all duration-200 ease-in-out border-0 rounded-lg z-60 hover:bg-n-alpha-1 dark:hover:bg-n-alpha-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50',
                            item.isSelected ? 'bg-n-alpha-1 dark:bg-n-solid-active' : '',
                            item.action === 'delete' ? 'text-n-ruby-11' : 'text-n-slate-12',
                        ].join(' ')}
                        disabled={item.disabled}
                        onClick={() => onAction(item)}
                    >
                        {item.thumbnail ? (
                            <Avatar
                                name={item.thumbnail.name}
                                src={item.thumbnail.src}
                                size={thumbnailSize}
                                roundedFull
                            />
                        ) : null}
                        {item.icon ? <Icon icon={item.icon} className="flex-shrink-0 size-3.5" /> : null}
                        {item.label ? (
                            <span className="min-w-0 text-sm font-420 truncate">{item.label}</span>
                        ) : null}
                    </button>
                ))}
                {!isLoading && !menuItems.length ? (
                    <div className="text-sm text-n-slate-11 px-2 py-1.5">{t('DROPDOWN_MENU.EMPTY_STATE')}</div>
                ) : null}
            </div>
        </div>
    );
}
