import { useEffect, useRef, useState } from 'react';

import { t } from '../../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SelectMenu from 'dashboard/components-next/selectmenu/SelectMenu';

// Port từ dashboard/components-next/Contacts/ContactsHeader/components/ContactSortMenu.vue.
export interface SortState {
    sort: string;
    order: string;
}

interface ContactSortMenuProps {
    activeSort?: string;
    activeOrdering?: string;
    onUpdateSort: (state: SortState) => void;
}

export default function ContactSortMenu({
    activeSort = 'last_activity_at',
    activeOrdering = '',
    onUpdateSort,
}: ContactSortMenuProps) {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [isMenuOpen]);

    const sortMenus = [
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.NAME'), value: 'name' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.EMAIL'), value: 'email' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.COMPANY'), value: 'company_name' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.COUNTRY'), value: 'country' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.CITY'), value: 'city' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.LAST_ACTIVITY'), value: 'last_activity_at' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.OPTIONS.CREATED_AT'), value: 'created_at' },
    ];

    const orderingMenus = [
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.ORDER.OPTIONS.ASCENDING'), value: '' },
        { label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.ORDER.OPTIONS.DESCENDING'), value: '-' },
    ];

    const activeSortLabel =
        sortMenus.find(menu => menu.value === activeSort)?.label ||
        t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.LABEL');
    const activeOrderingLabel =
        orderingMenus.find(menu => menu.value === activeOrdering)?.label ||
        t('CONTACTS_LAYOUT.HEADER.ACTIONS.ORDER.LABEL');

    return (
        <div ref={rootRef} className="relative">
            <Button
                icon="i-lucide-arrow-down-up"
                color="slate"
                size="sm"
                variant="ghost"
                className={isMenuOpen ? 'bg-n-alpha-2' : ''}
                onClick={() => setMenuOpen(open => !open)}
            />
            {isMenuOpen ? (
                <div className="absolute top-full mt-1 ltr:-right-32 rtl:-left-32 sm:ltr:right-0 sm:rtl:left-0 overlay-surface flex flex-col gap-4 w-72 rounded-xl p-4 z-50">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-n-slate-12">
                            {t('CONTACTS_LAYOUT.HEADER.ACTIONS.SORT_BY.LABEL')}
                        </span>
                        <SelectMenu
                            value={activeSort}
                            options={sortMenus}
                            label={activeSortLabel}
                            onChange={value => onUpdateSort({ sort: value, order: activeOrdering })}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-n-slate-12">
                            {t('CONTACTS_LAYOUT.HEADER.ACTIONS.ORDER.LABEL')}
                        </span>
                        <SelectMenu
                            value={activeOrdering}
                            options={orderingMenus}
                            label={activeOrderingLabel}
                            onChange={value => onUpdateSort({ sort: activeSort, order: value })}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
