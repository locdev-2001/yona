import { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Breadcrumb from 'dashboard/components-next/breadcrumb/Breadcrumb';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import Input from 'dashboard/components-next/input/Input';
import { useClickAway } from 'dashboard/composables/useClickAway';
import CategoryDialog from './CategoryDialog';
import { portalBySlug, useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/CategoryHeaderControls.vue.
interface CategoryHeaderControlsProps {
    categories: Category[];
    allowedLocales: AllowedLocaleOption[];
    hasSelectedCategory?: boolean;
    portalSlug: string;
    locale: string;
    categorySlug?: string;
    searchQuery?: string;
    onSearchQueryChange?: (query: string) => void;
    onLocaleChange?: (locale: string) => void;
    onNewArticle?: () => void;
}

export default function CategoryHeaderControls({
    categories,
    allowedLocales,
    hasSelectedCategory = false,
    portalSlug,
    locale,
    categorySlug,
    searchQuery = '',
    onSearchQueryChange,
    onLocaleChange,
    onNewArticle,
}: CategoryHeaderControlsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { portals } = useHelpCenterState();

    const [isLocaleMenuOpen, setLocaleMenuOpen] = useState(false);
    const [isCreateCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
    const [isEditCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
    const localeRef = useRef<HTMLDivElement>(null);
    const createRef = useRef<HTMLDivElement>(null);
    const editRef = useRef<HTMLDivElement>(null);

    useClickAway(localeRef, () => setLocaleMenuOpen(false), isLocaleMenuOpen);
    useClickAway(createRef, () => setCreateCategoryDialogOpen(false), isCreateCategoryDialogOpen);
    useClickAway(editRef, () => setEditCategoryDialogOpen(false), isEditCategoryDialogOpen);

    const currentPortal = portalSlug ? portalBySlug(portalSlug) : portals[0];
    const activeLocale = allowedLocales.find(item => item.code === locale);
    const activeLocaleName = activeLocale?.name ?? '';
    const activeLocaleCode = activeLocale?.code ?? '';

    const selectedCategory = categories.find(category => category.slug === categorySlug) ?? null;

    const localeMenuItems: DropdownMenuItem[] = allowedLocales.map(item => ({
        label: item.name,
        value: item.code,
        action: 'filter',
    }));

    const breadcrumbItems = [
        {
            label: t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.BREADCRUMB.CATEGORY_LOCALE', {
                localeCode: activeLocaleCode,
            }),
            link: '#',
        },
        ...(selectedCategory
            ? [
                  {
                      label: t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.BREADCRUMB.ACTIVE_CATEGORY', {
                          categoryName: selectedCategory.name,
                          categoryCount: selectedCategory.meta?.articles_count || 0,
                      }),
                      emoji: selectedCategory.icon,
                      iconColor: selectedCategory.icon_color,
                  },
              ]
            : []),
    ];

    return (
        <div className="flex items-center justify-between w-full">
            {!hasSelectedCategory ? (
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div ref={localeRef}>
                            <Button
                                label={activeLocaleName}
                                size="sm"
                                trailingIcon
                                icon="i-lucide-chevron-down"
                                color="slate"
                                onClick={() => setLocaleMenuOpen(open => !open)}
                            />
                            {isLocaleMenuOpen ? (
                                <DropdownMenu
                                    menuItems={localeMenuItems}
                                    showSearch
                                    className="left-0 w-40 mt-2 xl:right-0 top-full max-h-60"
                                    onAction={item => {
                                        onLocaleChange?.(String(item.value));
                                        setLocaleMenuOpen(false);
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                    <div className="w-px h-3.5 rounded my-auto bg-n-weak" />
                    <span className="min-w-0 text-sm font-medium truncate text-n-slate-12">
                        {t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.CATEGORIES_COUNT', { n: categories.length })}
                    </span>
                </div>
            ) : (
                <Breadcrumb
                    items={breadcrumbItems}
                    onClick={() => router.visit(`/app/accounts/${accountId}/portals/${portalSlug}/${locale}/categories`)}
                />
            )}
            {!hasSelectedCategory ? (
                <div className="flex items-center gap-2">
                    <Input
                        value={searchQuery}
                        placeholder={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.SEARCH_PLACEHOLDER')}
                        type="search"
                        size="sm"
                        className="w-48"
                        onChange={event => onSearchQueryChange?.(event.target.value)}
                    />
                    <div className="relative">
                        <div ref={createRef}>
                            <Button
                                label={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.NEW_CATEGORY')}
                                icon="i-lucide-plus"
                                size="sm"
                                onClick={() => setCreateCategoryDialogOpen(open => !open)}
                            />
                            {isCreateCategoryDialogOpen ? (
                                <CategoryDialog
                                    mode="create"
                                    portalSlug={portalSlug}
                                    portalName={currentPortal?.name}
                                    activeLocaleName={activeLocaleName}
                                    activeLocaleCode={activeLocaleCode}
                                    onClose={() => setCreateCategoryDialogOpen(false)}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative flex items-center gap-2">
                    <div ref={editRef}>
                        <Button
                            label={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_HEADER.EDIT_CATEGORY')}
                            color="slate"
                            size="sm"
                            onClick={() => setEditCategoryDialogOpen(open => !open)}
                        />
                        {isEditCategoryDialogOpen ? (
                            <CategoryDialog
                                selectedCategory={selectedCategory}
                                portalSlug={portalSlug}
                                portalName={currentPortal?.name}
                                activeLocaleName={activeLocaleName}
                                activeLocaleCode={activeLocaleCode}
                                onClose={() => setEditCategoryDialogOpen(false)}
                            />
                        ) : null}
                    </div>
                    <Button
                        label={t('HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.NEW_ARTICLE')}
                        icon="i-lucide-plus"
                        size="sm"
                        onClick={onNewArticle}
                    />
                </div>
            )}
        </div>
    );
}
