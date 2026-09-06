import { useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import type { TabBarTab } from 'dashboard/components-next/tabbar/TabBar';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { updateUISettings } from 'dashboard/composables/useUISettings';
import { ARTICLE_TABS, ARTICLE_TABS_OPTIONS, CATEGORY_ALL } from '../helper/portalHelper';
import type { AllowedLocaleOption, ArticlesMeta, Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticlePage/ArticleHeaderControls.vue.
interface ArticleHeaderControlsProps {
    categories: Category[];
    allowedLocales: AllowedLocaleOption[];
    meta: ArticlesMeta;
    activeTab?: string;
    activeLocale?: string;
    activeCategorySlug?: string;
    onTabChange: (tab: TabBarTab) => void;
    onLocaleChange: (locale: string) => void;
    onCategoryChange: (categorySlug: string) => void;
    onNewArticle: () => void;
}

const countKey = (value: string): keyof ArticlesMeta =>
    (value === 'all' ? 'articlesCount' : `${value}ArticlesCount`) as keyof ArticlesMeta;

export default function ArticleHeaderControls({
    categories,
    allowedLocales,
    meta,
    activeTab = '',
    activeLocale = '',
    activeCategorySlug = '',
    onTabChange,
    onLocaleChange,
    onCategoryChange,
    onNewArticle,
}: ArticleHeaderControlsProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [isLocaleMenuOpen, setLocaleMenuOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);
    const localeRef = useRef<HTMLDivElement>(null);

    useClickAway(categoryRef, () => setCategoryMenuOpen(false), isCategoryMenuOpen);
    useClickAway(localeRef, () => setLocaleMenuOpen(false), isLocaleMenuOpen);

    const tabs: TabBarTab[] = useMemo(
        () =>
            ARTICLE_TABS_OPTIONS.map(tab => ({
                label: t(`HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.TABS.${tab.key}`),
                value: tab.value,
                count: meta[countKey(tab.value)] as number,
            })),
        [meta],
    );

    const activeTabIndex = tabs.findIndex(tab => tab.value === (activeTab || ARTICLE_TABS.ALL));
    const activeCategory = categories.find(category => category.slug === activeCategorySlug);
    const activeCategoryName =
        activeCategory?.name || t('HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.CATEGORY.ALL');
    const activeLocaleName = allowedLocales.find(locale => locale.code === activeLocale)?.name;

    const categoryMenuItems: DropdownMenuItem[] = useMemo(() => {
        const defaultMenuItem = {
            label: t('HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.CATEGORY.ALL'),
            value: CATEGORY_ALL,
            action: 'filter',
        };

        const categoryItems = categories.map(category => ({
            label: category.name,
            value: category.slug,
            action: 'filter',
            emoji: category.icon,
            iconColor: category.icon_color,
        }));

        return activeCategorySlug ? [defaultMenuItem, ...categoryItems] : categoryItems;
    }, [categories, activeCategorySlug]);

    const localeMenuItems: DropdownMenuItem[] = allowedLocales.map(locale => ({
        label: locale.name,
        value: locale.code,
        action: 'filter',
    }));

    return (
        <div className="flex flex-col items-start w-full gap-2 lg:flex-row">
            <TabBar tabs={tabs} initialActiveTab={activeTabIndex} onTabChanged={onTabChange} />
            <div className="flex items-start justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <div ref={localeRef}>
                            <Button
                                label={activeLocaleName}
                                size="sm"
                                icon="i-lucide-chevron-down"
                                color="slate"
                                trailingIcon
                                onClick={() => setLocaleMenuOpen(open => !open)}
                            />
                            {isLocaleMenuOpen ? (
                                <DropdownMenu
                                    menuItems={localeMenuItems}
                                    showSearch
                                    className="left-0 w-40 max-w-[300px] mt-2 xl:right-0 top-full max-h-60"
                                    onAction={item => {
                                        onLocaleChange(String(item.value));
                                        setLocaleMenuOpen(false);
                                        updateUISettings(auth.user?.ui_settings ?? {}, {
                                            last_active_locale_code: String(item.value),
                                        });
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                    {categoryMenuItems.length ? (
                        <div className="relative group">
                            <div ref={categoryRef}>
                                <Button
                                    icon="i-lucide-chevron-down"
                                    size="sm"
                                    color="slate"
                                    trailingIcon
                                    className="max-w-48"
                                    onClick={() => setCategoryMenuOpen(open => !open)}
                                >
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        {activeCategory?.icon ? (
                                            <EmojiIcon
                                                value={activeCategory.icon}
                                                color={activeCategory.icon_color}
                                                className="flex-shrink-0 size-4"
                                            />
                                        ) : null}
                                        <span className="truncate">{activeCategoryName}</span>
                                    </span>
                                </Button>
                                {isCategoryMenuOpen ? (
                                    <DropdownMenu
                                        menuItems={categoryMenuItems}
                                        showSearch
                                        className="left-0 w-48 mt-2 xl:right-0 top-full max-h-60"
                                        onAction={item => {
                                            onCategoryChange(String(item.value));
                                            setCategoryMenuOpen(false);
                                        }}
                                    />
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
                <Button
                    label={t('HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.NEW_ARTICLE')}
                    icon="i-lucide-plus"
                    size="sm"
                    onClick={onNewArticle}
                />
            </div>
        </div>
    );
}
