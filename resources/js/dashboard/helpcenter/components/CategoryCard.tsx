import { useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import CardLayout from 'dashboard/components-next/CardLayout';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import { useClickAway } from 'dashboard/composables/useClickAway';

// Port từ components-next/HelpCenter/CategoryCard/CategoryCard.vue.
const CATEGORY_MENU_ITEMS: DropdownMenuItem[] = [
    { label: 'Edit', action: 'edit', value: 'edit', icon: 'i-lucide-pencil' },
    { label: 'Delete', action: 'delete', value: 'delete', icon: 'i-lucide-trash' },
];

interface CategoryCardProps {
    id: number;
    title: string;
    icon: string;
    iconColor?: string;
    // API trả null khi danh mục chưa có mô tả (Rails trả nil) — coi như rỗng.
    description: string | null;
    articlesCount: number;
    slug: string;
    className?: string;
    onClick?: (slug: string) => void;
    onAction?: (payload: { action: string; value: string | number; id: number }) => void;
}

export default function CategoryCard({
    id,
    title,
    icon,
    iconColor = '',
    description,
    articlesCount,
    slug,
    className = '',
    onClick,
    onAction,
}: CategoryCardProps) {
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickAway(dropdownRef, () => setShowActionsDropdown(false), showActionsDropdown);

    const hasDescription = (description ?? '').length > 0;

    return (
        <CardLayout className={className}>
            <div className="flex w-full gap-2">
                <div className="flex justify-between w-full gap-2">
                    <div className="flex items-center justify-start w-full min-w-0 gap-2">
                        <span
                            className="flex items-center gap-1.5 text-base truncate cursor-pointer hover:underline underline-offset-2 hover:text-n-blue-11 text-n-slate-12"
                            onClick={() => onClick?.(slug)}
                        >
                            {icon ? <EmojiIcon value={icon} color={iconColor} className="shrink-0 size-4" /> : null}
                            <span className="truncate">{title}</span>
                        </span>
                        <span className="inline-flex items-center justify-center h-6 px-2 py-1 text-xs text-center rounded-lg bg-n-surface-field whitespace-nowrap shrink-0 text-n-slate-11">
                            {t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_CARD.ARTICLES_COUNT', { count: articlesCount })}
                        </span>
                    </div>
                    <div ref={dropdownRef} className="relative group">
                        <Button
                            icon="i-lucide-ellipsis-vertical"
                            color="slate"
                            size="xs"
                            variant="ghost"
                            className="rounded-md group-hover:bg-n-alpha-2"
                            onClick={() => setShowActionsDropdown(open => !open)}
                        />
                        {showActionsDropdown ? (
                            <DropdownMenu
                                menuItems={CATEGORY_MENU_ITEMS}
                                className="mt-1 ltr:right-0 rtl:left-0 xl:ltr:left-0 xl:rtl:right-0 top-full z-60"
                                onAction={item => {
                                    onAction?.({ action: item.action, value: item.value, id });
                                    setShowActionsDropdown(false);
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
            <span className={`text-sm line-clamp-3 ${hasDescription ? 'text-n-slate-11' : 'text-n-slate-9'}`}>
                {hasDescription ? description : 'No description added'}
            </span>
        </CardLayout>
    );
}
