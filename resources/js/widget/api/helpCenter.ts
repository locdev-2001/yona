// Help Center công khai của hộp thư (/hc/{slug}/…, JSON khi Accept: application/json).
// Không cần phiên khách; widget đọc bài ngay trong khung chat.

export interface HelpArticle {
    id: number;
    slug?: string;
    title: string;
    description?: string | null;
    content?: string | null;
    /** Chỉ có ở API một bài: HTML đã render như trang Help Center. */
    content_html?: string | null;
    /** `/hc/{portal}/articles/{slug}` — kết quả tìm kiếm chỉ có link, không có slug. */
    link?: string;
    category_id?: number | null;
    last_updated_at?: string | null;
    views?: number;
    category?: { id: number; slug: string; name?: string } | null;
}

export interface HelpCategory {
    id?: number;
    name: string;
    slug: string;
    description?: string | null;
    meta?: { articles_count?: number };
}

async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(path, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'omit' });
    if (!response.ok) throw new Error(`Help center request failed: ${response.status}`);

    return (await response.json()) as T;
}

const base = (slug: string) => `/hc/${encodeURIComponent(slug)}`;

export const fetchArticles = (slug: string, locale: string, params: { query?: string; sort?: 'views'; perPage?: number } = {}): Promise<{ payload: HelpArticle[] }> => {
    const search = new URLSearchParams();
    if (params.query) search.set('query', params.query);
    if (params.sort) search.set('sort', params.sort);
    if (params.perPage) search.set('per_page', String(params.perPage));
    const query = search.toString();

    return getJson(`${base(slug)}/${encodeURIComponent(locale)}/articles${query ? `?${query}` : ''}`);
};

export const fetchCategories = (slug: string, locale: string): Promise<{ payload: HelpCategory[] }> =>
    getJson(`${base(slug)}/${encodeURIComponent(locale)}/categories`);

export const fetchArticle = (slug: string, articleSlug: string): Promise<HelpArticle> =>
    getJson(`${base(slug)}/articles/${encodeURIComponent(articleSlug)}`);

export const articleSlug = (article: HelpArticle): string => article.slug ?? article.link?.split('/').pop() ?? '';

// Trang Trợ giúp + danh mục dùng chung một lần tải; server không lọc bài theo danh mục
// nên lọc ở máy khách. ponytail: 100 bài/Help Center là trần của một trang, đủ cho SME.
const libraries = new Map<string, Promise<{ articles: HelpArticle[]; categories: HelpCategory[] }>>();

export function loadLibrary(slug: string, locale: string): Promise<{ articles: HelpArticle[]; categories: HelpCategory[] }> {
    const key = `${slug}/${locale}`;
    let library = libraries.get(key);
    if (!library) {
        library = Promise.all([fetchArticles(slug, locale, { perPage: 100 }), fetchCategories(slug, locale)]).then(([articles, categories]) => ({
            articles: articles.payload,
            categories: categories.payload,
        }));
        library.catch(() => libraries.delete(key));
        libraries.set(key, library);
    }

    return library;
}
