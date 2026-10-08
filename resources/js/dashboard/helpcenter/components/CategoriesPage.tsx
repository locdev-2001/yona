import { useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Loader from 'shared/components/loader/Loader';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import CategoryEmptyState from './CategoryEmptyState';
import CategoryHeaderControls from './CategoryHeaderControls';
import CategoryList from './CategoryList';
import EditCategoryDialog from './EditCategoryDialog';
import HelpCenterLayout from './HelpCenterLayout';
import { deleteCategory, reorderCategories, useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/CategoriesPage.vue.
interface CategoriesPageProps {
    categories: Category[];
    isFetching?: boolean;
    allowedLocales: AllowedLocaleOption[];
    portalSlug: string;
    locale: string;
    onFetchCategories: (locale: string) => void;
}

export default function CategoriesPage({
    categories,
    isFetching = false,
    allowedLocales,
    portalSlug,
    locale,
    onFetchCategories,
}: CategoriesPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { portalUiFlags } = useHelpCenterState();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const editCategoryDialogRef = useRef<DialogHandle>(null);

    const isLoading = isFetching || portalUiFlags.isSwitching;

    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return categories;

        return categories.filter(category => category.name?.toLowerCase().includes(query));
    }, [categories, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    const handleDelete = async (category: Category) => {
        try {
            await deleteCategory(accountId, portalSlug, category.id);
            useAlert(t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) || t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.DELETE.API.ERROR_MESSAGE'),
            );
        }
    };

    return (
        <HelpCenterLayout
            showPaginationFooter={false}
            portalSlug={portalSlug}
            breadcrumbLabel={t('HELP_CENTER.BREADCRUMB.CATEGORIES')}
            headerActions={
                <CategoryHeaderControls
                    categories={categories}
                    allowedLocales={allowedLocales}
                    hasSelectedCategory={false}
                    portalSlug={portalSlug}
                    locale={locale}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onLocaleChange={value => {
                        router.visit(`/app/accounts/${accountId}/portals/${portalSlug}/${value}/categories`);
                        onFetchCategories(value);
                    }}
                />
            }
            content={
                isLoading ? (
                    <div className="flex items-center justify-center py-10 text-n-slate-11">
                        <Loader />
                    </div>
                ) : filteredCategories.length ? (
                    <CategoryList
                        categories={filteredCategories}
                        disableDrag={isSearching}
                        onClick={slug =>
                            router.visit(
                                `/app/accounts/${accountId}/portals/${portalSlug}/${locale}/categories/${slug}/articles`,
                            )
                        }
                        onAction={({ action, id, category }) => {
                            if (action === 'edit') {
                                setSelectedCategory(categories.find(item => item.id === id) ?? null);
                                editCategoryDialogRef.current?.open();
                            }
                            if (action === 'delete') void handleDelete(category);
                        }}
                        onReorder={async positions => {
                            try {
                                await reorderCategories(accountId, portalSlug, positions);
                            } catch {
                                useAlert(t('HELP_CENTER.REORDER_CATEGORY.API.ERROR_MESSAGE'));
                            }
                        }}
                    />
                ) : isSearching ? (
                    <CategoryEmptyState
                        className="pt-14"
                        title={t('HELP_CENTER.CATEGORY_PAGE.SEARCH_EMPTY_STATE.TITLE')}
                        subtitle={t('HELP_CENTER.CATEGORY_PAGE.SEARCH_EMPTY_STATE.SUBTITLE')}
                    />
                ) : (
                    <CategoryEmptyState
                        className="pt-14"
                        title={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_EMPTY_STATE.TITLE')}
                        subtitle={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_EMPTY_STATE.SUBTITLE')}
                    />
                )
            }
        >
            <EditCategoryDialog
                ref={editCategoryDialogRef}
                allowedLocales={allowedLocales}
                selectedCategory={selectedCategory}
                portalSlug={portalSlug}
                locale={locale}
            />
        </HelpCenterLayout>
    );
}
