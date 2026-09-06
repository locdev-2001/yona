import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import ReorderableMultiSelect from 'dashboard/components-next/combobox/ReorderableMultiSelect';
import type { ComboBoxDropdownOption } from 'dashboard/components-next/combobox/ComboBoxDropdown';
import { articlesApi, categoriesApi } from '../api';
import { updatePortal } from '../store';
import type { LocaleDialogHandle } from './LocaleContentDialog';
import type { Article, Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/LocalePage/PopularContentDialog.vue.
const MAX_CATEGORIES = 3;
const MAX_ARTICLES = 6;
const KEY = 'HELP_CENTER.LOCALES_PAGE.POPULAR_CONTENT_DIALOG';
const SEARCH_DEBOUNCE_MS = 300;

const PopularContentDialog = forwardRef<LocaleDialogHandle, { portal: Portal | null }>(function PopularContentDialog(
    { portal },
    ref,
) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const [activeLocale, setActiveLocale] = useState('');
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState<ComboBoxDropdownOption[]>([]);
    const [articleOptions, setArticleOptions] = useState<ComboBoxDropdownOption[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<(string | number)[]>([]);
    const [selectedArticleIds, setSelectedArticleIds] = useState<(string | number)[]>([]);

    const popularContent = portal?.config?.popular_content ?? {};

    const toArticleOption = (article: Article): ComboBoxDropdownOption => ({
        value: article.id,
        label: article.title,
        subtitle: t(`${KEY}.ARTICLES.IN_CATEGORY`, {
            category: article.category?.name || t(`${KEY}.ARTICLES.UNCATEGORIZED`),
        }),
    });

    const loadCategories = async (localeCode: string) => {
        setCategoriesLoading(true);
        try {
            const { payload } = await categoriesApi.index(accountId, portal?.slug ?? '', localeCode);
            setCategoryOptions(
                payload.map(category => ({
                    value: category.id,
                    label: category.name,
                    subtitle: t(`${KEY}.CATEGORIES.ARTICLES_COUNT`, { count: category.meta?.articles_count || 0 }),
                    icon: category.icon,
                    iconColor: category.icon_color,
                })),
            );
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t(`${KEY}.API.ERROR_MESSAGE`));
        } finally {
            setCategoriesLoading(false);
        }
    };

    const loadArticles = async (localeCode: string, query = '') => {
        setArticlesLoading(true);
        try {
            const { payload } = await articlesApi.index(accountId, portal?.slug ?? '', {
                pageNumber: 1,
                locale: localeCode,
                status: 1,
                query: query || undefined,
            });
            setArticleOptions(payload.map(toArticleOption));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t(`${KEY}.API.ERROR_MESSAGE`));
        } finally {
            setArticlesLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        openForLocale: (localeCode: string) => {
            const existing = popularContent[localeCode] ?? {};
            setActiveLocale(localeCode);
            setSelectedCategoryIds([...(existing.category_ids ?? [])]);
            setSelectedArticleIds([...(existing.article_ids ?? [])]);
            setCategoryOptions([]);
            setArticleOptions([]);
            dialogRef.current?.open();

            void loadCategories(localeCode);
            void loadArticles(localeCode);
        },
    }));

    const onConfirm = async () => {
        const updated = { ...popularContent };
        const entry = {
            category_ids: selectedCategoryIds.map(Number),
            article_ids: selectedArticleIds.map(Number),
        };

        if (entry.category_ids.length || entry.article_ids.length) updated[activeLocale] = entry;
        else delete updated[activeLocale];

        try {
            await updatePortal(accountId, portal?.slug ?? '', { config: { popular_content: updated } });
            dialogRef.current?.close();
            useAlert(t(`${KEY}.API.SUCCESS_MESSAGE`));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t(`${KEY}.API.ERROR_MESSAGE`));
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t(`${KEY}.TITLE`)}
            description={t(`${KEY}.DESCRIPTION`)}
            confirmButtonLabel={t(`${KEY}.CONFIRM`)}
            onConfirm={onConfirm}
        >
            <div className="flex flex-col gap-5">
                <ReorderableMultiSelect
                    value={selectedCategoryIds}
                    options={categoryOptions}
                    max={MAX_CATEGORIES}
                    label={t(`${KEY}.CATEGORIES.LABEL`)}
                    addLabel={t(`${KEY}.ADD_ANOTHER`)}
                    searchPlaceholder={t(`${KEY}.SEARCH`)}
                    emptyState={t(`${KEY}.EMPTY`)}
                    fallbackIcon="i-lucide-folder"
                    loading={categoriesLoading}
                    counter={remaining => t(`${KEY}.SLOTS_LEFT`, { count: remaining })}
                    note={t(`${KEY}.OVERRIDING_DEFAULTS`)}
                    onChange={setSelectedCategoryIds}
                />
                <ReorderableMultiSelect
                    value={selectedArticleIds}
                    serverSearch
                    options={articleOptions}
                    max={MAX_ARTICLES}
                    label={t(`${KEY}.ARTICLES.LABEL`)}
                    addLabel={t(`${KEY}.ADD_ANOTHER`)}
                    searchPlaceholder={t(`${KEY}.SEARCH`)}
                    emptyState={t(`${KEY}.EMPTY`)}
                    loading={articlesLoading}
                    counter={remaining => t(`${KEY}.SLOTS_LEFT`, { count: remaining })}
                    note={t(`${KEY}.OVERRIDING_DEFAULTS`)}
                    onChange={setSelectedArticleIds}
                    onSearch={query => {
                        clearTimeout(searchTimerRef.current);
                        searchTimerRef.current = setTimeout(() => void loadArticles(activeLocale, query), SEARCH_DEBOUNCE_MS);
                    }}
                />
            </div>
        </Dialog>
    );
});

export default PopularContentDialog;
