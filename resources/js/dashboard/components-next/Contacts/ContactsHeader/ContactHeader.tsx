import type { ReactNode } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import Icon from 'dashboard/components-next/icon/Icon';
import ContactSortMenu from './components/ContactSortMenu';
import type { SortState } from './components/ContactSortMenu';
import ContactMoreActions from './components/ContactMoreActions';

// Port từ dashboard/components-next/Contacts/ContactsHeader/ContactHeader.vue.
// Khác biệt cố ý (ghi trong trace): nút "New message" giữ chỗ (ComposeConversation B3).
interface ContactHeaderProps {
    showSearch?: boolean;
    searchValue?: string;
    headerTitle: string;
    buttonLabel?: string;
    activeSort?: string;
    activeOrdering?: string;
    isActiveView?: boolean;
    isLabelView?: boolean;
    isSegmentsView?: boolean;
    hasActiveFilters?: boolean;
    filterSlot?: ReactNode;
    onSearch: (value: string) => void;
    onUpdateSort: (state: SortState) => void;
    onAdd: () => void;
    onImport: () => void;
    onExport: () => void;
    onFilter?: () => void;
    onCreateSegment?: () => void;
    onDeleteSegment?: () => void;
}

export default function ContactHeader({
    showSearch = true,
    searchValue = '',
    headerTitle,
    buttonLabel = '',
    activeSort = 'last_activity_at',
    activeOrdering = '',
    isActiveView = false,
    isLabelView = false,
    isSegmentsView = false,
    hasActiveFilters = false,
    filterSlot,
    onSearch,
    onUpdateSort,
    onAdd,
    onImport,
    onExport,
    onFilter,
    onCreateSegment,
    onDeleteSegment,
}: ContactHeaderProps) {
    return (
        <header className="sticky top-0 z-20 px-6">
            <div className="flex items-start sm:items-center justify-between w-full py-6 gap-2 mx-auto max-w-5xl">
                <span className="text-xl font-medium truncate text-n-slate-12">{headerTitle}</span>
                <div className="flex items-center flex-col sm:flex-row flex-shrink-0 gap-4">
                    {showSearch ? (
                        <div className="flex items-center gap-2 w-full">
                            <Input
                                value={searchValue}
                                type="search"
                                placeholder={t('CONTACTS_LAYOUT.HEADER.SEARCH_PLACEHOLDER')}
                                customInputClass="h-8 [&:not(.focus)]:!border-transparent bg-n-alpha-2 dark:bg-n-solid-1 ltr:!pl-8 !py-1 rtl:!pr-8"
                                className="w-full"
                                onChange={event => onSearch(event.target.value)}
                                prefix={
                                    <Icon
                                        icon="i-lucide-search"
                                        className="absolute -translate-y-1/2 text-n-slate-11 size-4 top-1/2 ltr:left-2 rtl:right-2"
                                    />
                                }
                            />
                        </div>
                    ) : null}
                    <div className="flex items-center flex-shrink-0 gap-4">
                        <div className="flex items-center gap-2">
                            {!isLabelView && !isActiveView ? (
                                <div className="relative">
                                    <Button
                                        id="toggleContactsFilterButton"
                                        icon={isSegmentsView ? 'i-lucide-pen-line' : 'i-lucide-list-filter'}
                                        color="slate"
                                        size="sm"
                                        className="relative w-8"
                                        variant="ghost"
                                        onClick={onFilter}
                                    >
                                        {hasActiveFilters && !isSegmentsView ? (
                                            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-n-brand" />
                                        ) : null}
                                    </Button>
                                    {filterSlot}
                                </div>
                            ) : null}
                            {hasActiveFilters && !isSegmentsView && !isLabelView && !isActiveView ? (
                                <Button
                                    icon="i-lucide-save"
                                    color="slate"
                                    size="sm"
                                    variant="ghost"
                                    onClick={onCreateSegment}
                                />
                            ) : null}
                            {isSegmentsView && !isLabelView && !isActiveView ? (
                                <Button
                                    icon="i-lucide-trash"
                                    color="slate"
                                    size="sm"
                                    variant="ghost"
                                    onClick={onDeleteSegment}
                                />
                            ) : null}
                            <ContactSortMenu
                                activeSort={activeSort}
                                activeOrdering={activeOrdering}
                                onUpdateSort={onUpdateSort}
                            />
                            <ContactMoreActions onAdd={onAdd} onImport={onImport} onExport={onExport} />
                        </div>
                        <div className="w-px h-4 bg-n-strong" />
                        <Button label={buttonLabel} size="sm" />
                    </div>
                </div>
            </div>
        </header>
    );
}
