import { useMemo, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import CardLayout from 'dashboard/components-next/CardLayout';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { buildLocaleMenuItems } from '../helper/portalHelper';

// Port từ components-next/HelpCenter/LocaleCard/LocaleCard.vue.
interface LocaleCardProps {
    locale: string;
    isDefault: boolean;
    isDraft: boolean;
    localeCode: string;
    articleCount: number;
    categoryCount: number;
    onAction: (payload: { action: string; value: string | number }) => void;
}

export default function LocaleCard({
    locale,
    isDefault,
    isDraft,
    localeCode,
    articleCount,
    categoryCount,
    onAction,
}: LocaleCardProps) {
    const [showDropdownMenu, setShowDropdownMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickAway(dropdownRef, () => setShowDropdownMenu(false), showDropdownMenu);

    const localeMenuItems = useMemo<DropdownMenuItem[]>(
        () =>
            buildLocaleMenuItems({ isDefault, isDraft }).map(item => ({
                ...item,
                label: t(item.label),
            })) as DropdownMenuItem[],
        [isDefault, isDraft],
    );

    return (
        <CardLayout>
            <div className="flex justify-between gap-2">
                <div className="flex items-center justify-start gap-2">
                    <span className="text-sm font-medium text-n-slate-12 line-clamp-1">{`${locale} (${localeCode})`}</span>
                    {isDefault ? (
                        <span className="bg-n-alpha-2 h-6 inline-flex items-center justify-center rounded-md text-xs border-px border-transparent text-n-blue-11 px-2 py-0.5">
                            {t('HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DEFAULT')}
                        </span>
                    ) : isDraft ? (
                        <span className="bg-n-alpha-2 h-6 inline-flex items-center justify-center rounded-md text-xs border-px border-transparent text-n-slate-11 px-2 py-0.5">
                            {t('HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DRAFT')}
                        </span>
                    ) : null}
                </div>
                <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-n-slate-11 whitespace-nowrap">
                            {t('HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.ARTICLES_COUNT', { count: articleCount })}
                        </span>
                        <div className="w-px h-3 bg-n-weak" />
                        <span className="text-sm text-n-slate-11 whitespace-nowrap">
                            {t('HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.CATEGORIES_COUNT', { count: categoryCount })}
                        </span>
                    </div>
                    {localeMenuItems.length ? (
                        <div ref={dropdownRef} className="relative group">
                            <Button
                                icon="i-lucide-ellipsis-vertical"
                                color="slate"
                                size="xs"
                                className="rounded-md group-hover:bg-n-alpha-2"
                                onClick={() => setShowDropdownMenu(open => !open)}
                            />
                            {showDropdownMenu ? (
                                <DropdownMenu
                                    menuItems={localeMenuItems}
                                    className="ltr:right-0 rtl:left-0 mt-1 top-full z-60 min-w-[150px]"
                                    onAction={item => {
                                        onAction({ action: item.action, value: item.value });
                                        setShowDropdownMenu(false);
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </CardLayout>
    );
}
