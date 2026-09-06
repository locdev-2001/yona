// Port từ dashboard/helper/portalHelper.js.
const formatCustomDomain = (customDomain: string): string =>
    customDomain.startsWith('https') ? customDomain : `https://${customDomain}`;

const getDefaultBaseURL = (): string => window.location.origin;

const getPortalBaseURL = (customDomain?: string | null): string =>
    customDomain ? formatCustomDomain(customDomain) : getDefaultBaseURL();

export const buildPortalURL = (portalSlug: string, customDomain?: string | null): string =>
    `${getPortalBaseURL(customDomain)}/hc/${portalSlug}`;

export const buildPortalArticleURL = (
    portalSlug: string,
    _categorySlug: string | undefined,
    _locale: string | undefined,
    articleSlug: string | number,
    customDomain?: string | null,
): string => `${buildPortalURL(portalSlug, customDomain)}/articles/${articleSlug}`;

export const ARTICLE_STATUSES = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
} as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[keyof typeof ARTICLE_STATUSES];

// Bản gốc gửi mã số trạng thái cho API (`draft` = 0…).
export const getArticleStatus = (status?: string | null): number | undefined => {
    switch (status) {
        case 'draft':
            return 0;
        case 'published':
            return 1;
        case 'archived':
            return 2;
        default:
            return undefined;
    }
};

export interface MenuItem {
    label: string;
    value: string | number;
    action: string;
    icon?: string;
    emoji?: string;
    iconColor?: string;
    disabled?: boolean;
    isSelected?: boolean;
    thumbnail?: { name: string; src?: string };
}

export const ARTICLE_MENU_ITEMS: Record<string, MenuItem> = {
    publish: {
        label: 'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.PUBLISH',
        value: ARTICLE_STATUSES.PUBLISHED,
        action: 'publish',
        icon: 'i-lucide-check',
    },
    draft: {
        label: 'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.DRAFT',
        value: ARTICLE_STATUSES.DRAFT,
        action: 'draft',
        icon: 'i-lucide-pencil-line',
    },
    archive: {
        label: 'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.ARCHIVE',
        value: ARTICLE_STATUSES.ARCHIVED,
        action: 'archive',
        icon: 'i-lucide-archive-restore',
    },
    translate: {
        label: 'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.TRANSLATE',
        value: 'translate',
        action: 'translate',
        icon: 'i-lucide-languages',
    },
    delete: {
        label: 'HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.DROPDOWN_MENU.DELETE',
        value: 'delete',
        action: 'delete',
        icon: 'i-lucide-trash',
    },
};

export const ARTICLE_MENU_OPTIONS: Record<string, string[]> = {
    [ARTICLE_STATUSES.ARCHIVED]: ['publish', 'draft', 'translate'],
    [ARTICLE_STATUSES.DRAFT]: ['publish', 'archive', 'translate'],
    [ARTICLE_STATUSES.PUBLISHED]: ['draft', 'archive', 'translate'],
};

export const ARTICLE_TABS = {
    ALL: 'all',
    MINE: 'mine',
    DRAFT: 'draft',
    ARCHIVED: 'archived',
} as const;

export const CATEGORY_ALL = 'all';

export const ARTICLE_TABS_OPTIONS = [
    { key: 'ALL', value: 'all' },
    { key: 'MINE', value: 'mine' },
    { key: 'DRAFT', value: 'draft' },
    { key: 'ARCHIVED', value: 'archived' },
];

export const LOCALE_MENU_ITEMS: Record<string, MenuItem> = {
    makeDefault: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.MAKE_DEFAULT',
        action: 'change-default',
        value: 'default',
        icon: 'i-lucide-star',
    },
    moveToDraft: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.MOVE_TO_DRAFT',
        action: 'move-to-draft',
        value: 'draft',
        icon: 'i-lucide-eye-off',
    },
    publishLocale: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.PUBLISH_LOCALE',
        action: 'publish-locale',
        value: 'publish',
        icon: 'i-lucide-eye',
    },
    customizeContent: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.CUSTOMIZE_CONTENT',
        action: 'customize-content',
        value: 'customize-content',
        icon: 'i-lucide-pencil',
    },
    selectPopularContent: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.SELECT_POPULAR_CONTENT',
        action: 'select-popular-content',
        value: 'select-popular-content',
        icon: 'i-lucide-sparkles',
    },
    delete: {
        label: 'HELP_CENTER.LOCALES_PAGE.LOCALE_CARD.DROPDOWN_MENU.DELETE',
        action: 'delete',
        value: 'delete',
        icon: 'i-lucide-trash',
    },
};

const disableLocaleMenuItems = (menuItems: MenuItem[]): MenuItem[] =>
    menuItems.map(item => ({ ...item, disabled: true }));

export const buildLocaleMenuItems = ({ isDefault, isDraft }: { isDefault: boolean; isDraft: boolean }): MenuItem[] => {
    if (isDefault) {
        return [
            ...disableLocaleMenuItems([LOCALE_MENU_ITEMS.makeDefault, LOCALE_MENU_ITEMS.moveToDraft]),
            LOCALE_MENU_ITEMS.customizeContent,
            LOCALE_MENU_ITEMS.selectPopularContent,
            ...disableLocaleMenuItems([LOCALE_MENU_ITEMS.delete]),
        ];
    }

    if (isDraft) {
        return [
            LOCALE_MENU_ITEMS.publishLocale,
            LOCALE_MENU_ITEMS.customizeContent,
            LOCALE_MENU_ITEMS.selectPopularContent,
            LOCALE_MENU_ITEMS.delete,
        ];
    }

    return [
        LOCALE_MENU_ITEMS.makeDefault,
        LOCALE_MENU_ITEMS.moveToDraft,
        LOCALE_MENU_ITEMS.customizeContent,
        LOCALE_MENU_ITEMS.selectPopularContent,
        LOCALE_MENU_ITEMS.delete,
    ];
};

export const ARTICLE_EDITOR_STATUS_OPTIONS: Record<string, string[]> = {
    published: ['archive', 'draft'],
    archived: ['draft'],
    draft: ['archive'],
};
