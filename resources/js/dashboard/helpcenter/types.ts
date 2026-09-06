// Hình dạng payload theo contract ở reports/e4-notes-be.md §1.
export interface PortalLogo {
    id: number;
    portal_id: number;
    file_type: string;
    account_id: number;
    file_url: string;
    blob_id: number;
    filename: string;
}

export interface PortalAllowedLocale {
    code: string;
    articles_count: number;
    categories_count: number;
    draft: boolean;
}

export interface PortalConfig {
    allowed_locales: PortalAllowedLocale[];
    default_locale: string;
    layout: 'classic' | 'documentation';
    social_profiles: Record<string, string>;
    locale_translations: Record<string, { name?: string; page_title?: string; header_text?: string }>;
    popular_content: Record<string, { category_ids?: number[]; article_ids?: number[] }>;
    analytics: Record<string, string>;
    draft_locales?: string[];
}

export interface PortalMeta {
    all_articles_count: number;
    archived_articles_count: number | null;
    published_count: number | null;
    draft_articles_count: number | null;
    mine_articles_count?: number | null;
    categories_count: number;
    default_locale: string;
}

export interface Portal {
    id: number;
    color: string;
    custom_domain: string | null;
    header_text: string | null;
    homepage_link: string | null;
    name: string;
    page_title: string | null;
    slug: string;
    archived: boolean;
    account_id: number;
    config: PortalConfig;
    inbox?: { id: number; name: string } | null;
    logo?: PortalLogo | null;
    meta: PortalMeta;
    ssl_settings?: { status: string | null; verification_errors: string | null };
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    locale: string;
    description: string | null;
    position: number;
    account_id: number;
    icon: string;
    icon_color: string;
    related_categories?: Category[];
    parent_category?: Category;
    root_category?: Category;
    meta?: { articles_count: number };
}

export interface ArticleAuthor {
    id: number;
    name: string;
    available_name?: string;
    availableName?: string;
    thumbnail?: string;
}

export interface Article {
    id: number;
    slug: string;
    title: string;
    content: string;
    description: string;
    status: string;
    draftTitle: string | null;
    draftContent: string | null;
    position: number;
    accountId: number;
    updatedAt: number;
    meta: { title?: string; description?: string; tags?: string[] };
    category: { id: number; name?: string; slug?: string; locale?: string; icon?: string; icon_color?: string };
    views: number;
    author?: ArticleAuthor | null;
}

export interface ArticlesMeta {
    allArticlesCount: number;
    archivedArticlesCount: number;
    articlesCount: number;
    currentPage: number;
    draftArticlesCount: number;
    mineArticlesCount: number;
    publishedCount: number;
}

export interface AllowedLocaleOption {
    id: string;
    name: string;
    code: string;
    isDraft?: boolean;
    articlesCount?: number;
    categoriesCount?: number;
}
