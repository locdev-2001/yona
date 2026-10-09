import { t } from '../../../i18n';
import MenuItem from './MenuItem';

// Port từ routes/dashboard/inbox/components/InboxOptionMenu.vue.
const MENU_ITEMS = [
    { key: 'mark_all_read', labelKey: 'INBOX.MENU_ITEM.MARK_ALL_READ' },
    { key: 'delete_all', labelKey: 'INBOX.MENU_ITEM.DELETE_ALL' },
    { key: 'delete_all_read', labelKey: 'INBOX.MENU_ITEM.DELETE_ALL_READ' },
];

export default function InboxOptionMenu({
    className = '',
    onOptionClick,
}: {
    className?: string;
    onOptionClick: (key: string) => void;
}) {
    return (
        <div
            className={`z-50 flex flex-col max-w-64 min-w-40 gap-1 overlay-surface py-2 px-2 rounded-xl ${className}`}
        >
            <div className="flex flex-col">
                {MENU_ITEMS.map(item => (
                    <MenuItem key={item.key} label={t(item.labelKey)} onClick={() => onOptionClick(item.key)} />
                ))}
            </div>
        </div>
    );
}
