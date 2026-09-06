// Port từ dashboard/api/helpCenter/{portals,categories,articles}.js.
// Cùng URL, cùng tên tham số; chuyển sang apiClient dùng chung của Yona.
// Khác bản gốc: Rails tự bọc body vào khoá `portal`/`category`/`article`
// (ParamsWrapper) nên Chatwoot gửi phẳng — Laravel không bọc, phải gửi kèm khoá.
import { ApiError, deleteJson, getJson, patchJson, postJson, xsrfToken } from 'dashboard/helper/apiClient';
import { camelizeKeys } from 'dashboard/helper/transformKeys';
import type { Article, ArticlesMeta, Category, Portal } from './types';

const base = (accountId: number) => `/api/v1/accounts/${accountId}/portals`;

// `inbox_id` và `blob_id` nằm NGOÀI khối `portal` (giống bản gốc).
const PORTAL_TOP_LEVEL_KEYS = ['inbox_id', 'blob_id'];

function wrapPortal(portal: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { portal: {} };
    Object.entries(portal).forEach(([key, value]) => {
        if (PORTAL_TOP_LEVEL_KEYS.includes(key)) body[key] = value;
        else (body.portal as Record<string, unknown>)[key] = value;
    });

    return body;
}

// DELETE kèm body (bulk delete) — apiClient dùng chung chưa hỗ trợ.
async function deleteWithBody<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new ApiError(response.status, await response.json().catch(() => null));
    }

    const raw = await response.text();

    return (raw ? JSON.parse(raw) : null) as T;
}

export const portalsApi = {
    index: (accountId: number) => getJson<{ payload: Portal[] }>(base(accountId)),
    show: (accountId: number, portalSlug: string, locale: string) =>
        getJson<Portal>(`${base(accountId)}/${portalSlug}?locale=${encodeURIComponent(locale)}`),
    create: (accountId: number, portal: Record<string, unknown>) =>
        postJson<Portal>(base(accountId), wrapPortal(portal)),
    update: (accountId: number, portalSlug: string, portal: Record<string, unknown>) =>
        patchJson<Portal>(`${base(accountId)}/${portalSlug}`, wrapPortal(portal)),
    destroy: (accountId: number, portalSlug: string) => deleteJson(`${base(accountId)}/${portalSlug}`),
    deleteLogo: (accountId: number, portalSlug: string) => deleteJson(`${base(accountId)}/${portalSlug}/logo`),
    sendCnameInstructions: (accountId: number, portalSlug: string, email: string) =>
        postJson(`${base(accountId)}/${portalSlug}/send_instructions`, { email }),
};

export const categoriesApi = {
    index: (accountId: number, portalSlug: string, locale: string) =>
        getJson<{ payload: Category[] }>(`${base(accountId)}/${portalSlug}/categories?locale=${encodeURIComponent(locale ?? '')}`),
    create: (accountId: number, portalSlug: string, category: Record<string, unknown>) =>
        postJson<{ payload: Category }>(`${base(accountId)}/${portalSlug}/categories`, { category }),
    update: (accountId: number, portalSlug: string, categoryId: number, category: Record<string, unknown>) =>
        patchJson<{ payload: Category }>(`${base(accountId)}/${portalSlug}/categories/${categoryId}`, { category }),
    destroy: (accountId: number, portalSlug: string, categoryId: number) =>
        deleteJson(`${base(accountId)}/${portalSlug}/categories/${categoryId}`),
    reorder: (accountId: number, portalSlug: string, positionsHash: Record<string, number>) =>
        postJson(`${base(accountId)}/${portalSlug}/categories/reorder`, { positions_hash: positionsHash }),
};

export interface ArticlesQuery {
    pageNumber?: number;
    locale?: string;
    status?: number;
    authorId?: number | null;
    categorySlug?: string;
    query?: string;
    sort?: string;
}

// getArticleSearchURL của URLHelper: bỏ hẳn tham số rỗng khỏi query string.
function articlesUrl(accountId: number, portalSlug: string, params: ArticlesQuery): string {
    const search = new URLSearchParams();
    if (params.pageNumber) search.set('page', String(params.pageNumber));
    if (params.locale) search.set('locale', params.locale);
    if (params.status !== undefined && params.status !== null) search.set('status', String(params.status));
    if (params.authorId) search.set('author_id', String(params.authorId));
    if (params.categorySlug) search.set('category_slug', params.categorySlug);
    if (params.sort) search.set('sort', params.sort);
    if (params.query) search.set('query', params.query);

    const queryString = search.toString();

    return `${base(accountId)}/${portalSlug}/articles${queryString ? `?${queryString}` : ''}`;
}

export const articlesApi = {
    index: async (accountId: number, portalSlug: string, params: ArticlesQuery) => {
        const data = await getJson<{ payload: unknown[]; meta: Record<string, number> }>(
            articlesUrl(accountId, portalSlug, params),
        );

        return {
            payload: camelizeKeys<Article[]>(data.payload, []),
            meta: camelizeKeys<ArticlesMeta>(data.meta),
        };
    },
    show: async (accountId: number, portalSlug: string, articleId: number | string) => {
        const data = await getJson<{ payload: unknown }>(`${base(accountId)}/${portalSlug}/articles/${articleId}`);

        return camelizeKeys<Article>(data.payload);
    },
    create: async (accountId: number, portalSlug: string, article: Record<string, unknown>) => {
        const data = await postJson<{ payload: unknown }>(`${base(accountId)}/${portalSlug}/articles`, { article });

        return camelizeKeys<Article>(data.payload);
    },
    update: async (accountId: number, portalSlug: string, articleId: number | string, article: Record<string, unknown>) => {
        const data = await patchJson<{ payload: unknown }>(
            `${base(accountId)}/${portalSlug}/articles/${articleId}`,
            { article },
        );

        return camelizeKeys<Article>(data.payload);
    },
    destroy: (accountId: number, portalSlug: string, articleId: number | string) =>
        deleteJson(`${base(accountId)}/${portalSlug}/articles/${articleId}`),
    reorder: (accountId: number, portalSlug: string, positionsHash: Record<string, number>) =>
        postJson<{ positions?: Record<string, number> }>(`${base(accountId)}/${portalSlug}/articles/reorder`, {
            positions_hash: positionsHash,
        }),
    bulkUpdateStatus: (accountId: number, portalSlug: string, articleIds: number[], status: string) =>
        patchJson(`${base(accountId)}/${portalSlug}/articles/bulk_actions/update_status`, { ids: articleIds, status }),
    bulkUpdateCategory: (accountId: number, portalSlug: string, articleIds: number[], categoryId: number) =>
        patchJson(`${base(accountId)}/${portalSlug}/articles/bulk_actions/update_category`, {
            ids: articleIds,
            category_id: categoryId,
        }),
    bulkDelete: (accountId: number, portalSlug: string, articleIds: number[]) =>
        deleteWithBody(`${base(accountId)}/${portalSlug}/articles/bulk_actions/delete_articles`, { ids: articleIds }),
};
