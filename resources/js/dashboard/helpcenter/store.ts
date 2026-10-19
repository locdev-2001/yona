import { useSyncExternalStore } from 'react';

import { articlesApi, categoriesApi, portalsApi, type ArticlesQuery } from './api';
import type { Article, ArticlesMeta, Category, Portal } from './types';

// Port từ store/modules/helpCenter{Portals,Categories,Articles} — ba module vuex
// gộp vào một ô nhớ cấp module + useSyncExternalStore (cùng lối search/store.ts).

interface PortalUiFlags {
    isFetching: boolean;
    isFetchingItem: boolean;
    isCreating: boolean;
    isSwitching: boolean;
}

interface HelpCenterState {
    portals: Portal[];
    portalMeta: Portal['meta'] | null;
    portalUiFlags: PortalUiFlags;
    portalFlagsBySlug: Record<string, { isUpdating?: boolean; isDeleting?: boolean }>;
    categories: Category[];
    isFetchingCategories: boolean;
    isCreatingCategory: boolean;
    categoryFlagsById: Record<number, { isUpdating?: boolean; isDeleting?: boolean }>;
    articles: Article[];
    articlesMeta: ArticlesMeta;
    isFetchingArticles: boolean;
    articleFlagsById: Record<number, { isUpdating?: boolean; isDeleting?: boolean }>;
}

const emptyArticlesMeta = (): ArticlesMeta => ({
    allArticlesCount: 0,
    archivedArticlesCount: 0,
    articlesCount: 0,
    currentPage: 1,
    draftArticlesCount: 0,
    mineArticlesCount: 0,
    publishedCount: 0,
});

const initialState = (): HelpCenterState => ({
    portals: [],
    portalMeta: null,
    portalUiFlags: { isFetching: false, isFetchingItem: false, isCreating: false, isSwitching: false },
    portalFlagsBySlug: {},
    categories: [],
    isFetchingCategories: false,
    isCreatingCategory: false,
    categoryFlagsById: {},
    articles: [],
    articlesMeta: emptyArticlesMeta(),
    isFetchingArticles: false,
    articleFlagsById: {},
});

let state: HelpCenterState = initialState();
const listeners = new Set<() => void>();

function setState(next: Partial<HelpCenterState>): void {
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function useHelpCenterState(): HelpCenterState {
    return useSyncExternalStore(
        subscribe,
        () => state,
        () => state,
    );
}

export function getHelpCenterState(): HelpCenterState {
    return state;
}

export const portalBySlug = (slug?: string | null): Portal | undefined =>
    state.portals.find(portal => portal.slug === slug);

export const categoryById = (id?: number | null): Category | undefined =>
    state.categories.find(category => category.id === id);

export const articleById = (id?: number | string | null): Article | undefined =>
    state.articles.find(article => String(article.id) === String(id));

// ---------- portals ----------

export async function fetchPortals(accountId: number): Promise<void> {
    setState({ portalUiFlags: { ...state.portalUiFlags, isFetching: true } });
    try {
        const { payload } = await portalsApi.index(accountId);
        setState({ portals: payload });
    } finally {
        setState({ portalUiFlags: { ...state.portalUiFlags, isFetching: false } });
    }
}

// portals/show chỉ dùng để làm mới `meta` (bản gốc bỏ qua lỗi).
export async function fetchPortalMeta(accountId: number, portalSlug: string, locale: string): Promise<void> {
    setState({ portalUiFlags: { ...state.portalUiFlags, isFetchingItem: true } });
    try {
        const portal = await portalsApi.show(accountId, portalSlug, locale);
        setState({ portalMeta: portal.meta });
    } catch {
        // Bản gốc nuốt lỗi ở đây.
    } finally {
        setState({ portalUiFlags: { ...state.portalUiFlags, isFetchingItem: false } });
    }
}

export function setSwitchingPortal(isSwitching: boolean): void {
    setState({ portalUiFlags: { ...state.portalUiFlags, isSwitching } });
}

export async function createPortal(accountId: number, portal: Record<string, unknown>): Promise<Portal> {
    setState({ portalUiFlags: { ...state.portalUiFlags, isCreating: true } });
    try {
        const created = await portalsApi.create(accountId, portal);
        setState({ portals: [...state.portals, created] });

        return created;
    } finally {
        setState({ portalUiFlags: { ...state.portalUiFlags, isCreating: false } });
    }
}

function setPortalFlags(portalSlug: string, flags: Record<string, boolean>): void {
    setState({
        portalFlagsBySlug: {
            ...state.portalFlagsBySlug,
            [portalSlug]: { ...state.portalFlagsBySlug[portalSlug], ...flags },
        },
    });
}

export async function updatePortal(
    accountId: number,
    portalSlug: string,
    portal: Record<string, unknown>,
): Promise<Portal> {
    setPortalFlags(portalSlug, { isUpdating: true });
    try {
        const updated = await portalsApi.update(accountId, portalSlug, portal);
        setState({ portals: state.portals.map(item => (item.slug === portalSlug ? updated : item)) });

        return updated;
    } finally {
        setPortalFlags(portalSlug, { isUpdating: false });
    }
}

export async function deletePortal(accountId: number, portalSlug: string): Promise<void> {
    setPortalFlags(portalSlug, { isDeleting: true });
    try {
        await portalsApi.destroy(accountId, portalSlug);
        setState({ portals: state.portals.filter(portal => portal.slug !== portalSlug) });
    } finally {
        setPortalFlags(portalSlug, { isDeleting: false });
    }
}

export async function deletePortalLogo(accountId: number, portalSlug: string): Promise<void> {
    setPortalFlags(portalSlug, { isUpdating: true });
    try {
        await portalsApi.deleteLogo(accountId, portalSlug);
    } finally {
        setPortalFlags(portalSlug, { isUpdating: false });
    }
}

// ---------- categories ----------

export async function fetchCategories(accountId: number, portalSlug?: string, locale?: string): Promise<void> {
    if (!portalSlug) return;

    setState({ isFetchingCategories: true });
    try {
        const { payload } = await categoriesApi.index(accountId, portalSlug, locale ?? '');
        setState({ categories: payload });
    } finally {
        setState({ isFetchingCategories: false });
    }
}

export async function createCategory(
    accountId: number,
    portalSlug: string,
    category: Record<string, unknown>,
): Promise<Category> {
    setState({ isCreatingCategory: true });
    try {
        const { payload } = await categoriesApi.create(accountId, portalSlug, category);
        setState({ categories: [...state.categories, payload] });

        return payload;
    } finally {
        setState({ isCreatingCategory: false });
    }
}

function setCategoryFlags(categoryId: number, flags: Record<string, boolean>): void {
    setState({
        categoryFlagsById: {
            ...state.categoryFlagsById,
            [categoryId]: { ...state.categoryFlagsById[categoryId], ...flags },
        },
    });
}

export async function updateCategory(
    accountId: number,
    portalSlug: string,
    categoryId: number,
    category: Record<string, unknown>,
): Promise<void> {
    setCategoryFlags(categoryId, { isUpdating: true });
    try {
        const { payload } = await categoriesApi.update(accountId, portalSlug, categoryId, category);
        setState({ categories: state.categories.map(item => (item.id === categoryId ? payload : item)) });
    } finally {
        setCategoryFlags(categoryId, { isUpdating: false });
    }
}

export async function deleteCategory(accountId: number, portalSlug: string, categoryId: number): Promise<void> {
    setCategoryFlags(categoryId, { isDeleting: true });
    try {
        await categoriesApi.destroy(accountId, portalSlug, categoryId);
        setState({ categories: state.categories.filter(category => category.id !== categoryId) });
    } finally {
        setCategoryFlags(categoryId, { isDeleting: false });
    }
}

// Cập nhật vị trí trong bộ nhớ trước, lỗi thì trả lại giá trị cũ.
export async function reorderCategories(
    accountId: number,
    portalSlug: string,
    positionsHash: Record<string, number>,
): Promise<void> {
    const previous = Object.fromEntries(
        Object.keys(positionsHash).map(id => [id, categoryById(Number(id))?.position ?? 0]),
    );
    applyCategoryPositions(positionsHash);
    try {
        await categoriesApi.reorder(accountId, portalSlug, positionsHash);
    } catch (error) {
        applyCategoryPositions(previous);
        throw error;
    }
}

function applyCategoryPositions(positions: Record<string, number>): void {
    setState({
        categories: state.categories.map(category =>
            positions[category.id] === undefined ? category : { ...category, position: positions[category.id] },
        ),
    });
}

// ---------- articles ----------

export async function fetchArticles(accountId: number, portalSlug: string, params: ArticlesQuery): Promise<void> {
    setState({ isFetchingArticles: true });
    try {
        const { payload, meta } = await articlesApi.index(accountId, portalSlug, params);
        setState({ articles: payload, articlesMeta: meta });
    } finally {
        setState({ isFetchingArticles: false });
    }
}

// updateArticleMeta: chỉ làm mới bộ đếm, giữ nguyên trang hiện tại.
export async function refreshArticlesMeta(accountId: number, portalSlug: string, locale?: string): Promise<void> {
    const { meta } = await articlesApi.index(accountId, portalSlug, { pageNumber: 1, locale });
    setState({ articlesMeta: { ...meta, currentPage: state.articlesMeta.currentPage } });
}

export async function fetchArticle(accountId: number, portalSlug: string, articleId: number | string): Promise<void> {
    setState({ isFetchingArticles: true });
    try {
        const article = await articlesApi.show(accountId, portalSlug, articleId);
        upsertArticle(article);
    } catch {
        // Bản gốc nuốt lỗi ở articles/show.
    } finally {
        setState({ isFetchingArticles: false });
    }
}

function upsertArticle(article: Article): void {
    const exists = state.articles.some(item => item.id === article.id);
    setState({
        articles: exists ? state.articles.map(item => (item.id === article.id ? article : item)) : [...state.articles, article],
    });
}

export async function createArticle(
    accountId: number,
    portalSlug: string,
    article: Record<string, unknown>,
): Promise<number> {
    const created = await articlesApi.create(accountId, portalSlug, article);
    upsertArticle(created);

    return created.id;
}

function setArticleFlags(articleId: number | string, flags: Record<string, boolean>): void {
    setState({
        articleFlagsById: {
            ...state.articleFlagsById,
            [Number(articleId)]: { ...state.articleFlagsById[Number(articleId)], ...flags },
        },
    });
}

export function articleUiFlags(articleId?: number | string | null): { isUpdating?: boolean; isDeleting?: boolean } {
    return state.articleFlagsById[Number(articleId)] ?? {};
}

export function categoryUiFlags(categoryId?: number | null): { isUpdating?: boolean; isDeleting?: boolean } {
    return state.categoryFlagsById[Number(categoryId)] ?? {};
}

export function portalUiFlagsIn(portalSlug?: string | null): { isUpdating?: boolean; isDeleting?: boolean } {
    return state.portalFlagsBySlug[portalSlug ?? ''] ?? {};
}

export async function updateArticle(
    accountId: number,
    portalSlug: string,
    articleId: number | string,
    article: Record<string, unknown>,
): Promise<void> {
    setArticleFlags(articleId, { isUpdating: true });
    try {
        const updated = await articlesApi.update(accountId, portalSlug, articleId, article);
        upsertArticle(updated);
    } finally {
        setArticleFlags(articleId, { isUpdating: false });
    }
}

// publishDraft: đẩy nháp thành bản chính rồi xoá nháp; chỉ gửi trường đã sửa.
export function publishArticleDraft(
    accountId: number,
    portalSlug: string,
    articleId: number | string,
    status?: number,
): Promise<void> {
    const article = articleById(articleId);
    const payload: Record<string, unknown> = { status, draft_title: null, draft_content: null };
    if (article?.draftTitle != null) payload.title = article.draftTitle;
    if (article?.draftContent != null) payload.content = article.draftContent;

    return updateArticle(accountId, portalSlug, articleId, payload);
}

export function discardArticleDraft(
    accountId: number,
    portalSlug: string,
    articleId: number | string,
    status?: number,
): Promise<void> {
    return updateArticle(accountId, portalSlug, articleId, { status, draft_title: null, draft_content: null });
}

export async function deleteArticle(accountId: number, portalSlug: string, articleId: number | string): Promise<void> {
    setArticleFlags(articleId, { isDeleting: true });
    try {
        await articlesApi.destroy(accountId, portalSlug, articleId);
        setState({ articles: state.articles.filter(article => String(article.id) !== String(articleId)) });
    } finally {
        setArticleFlags(articleId, { isDeleting: false });
    }
}

function applyArticlePositions(positions: Record<string, number>): void {
    setState({
        articles: state.articles.map(article =>
            positions[article.id] === undefined ? article : { ...article, position: positions[article.id] },
        ),
    });
}

export async function reorderArticles(
    accountId: number,
    portalSlug: string,
    positionsHash: Record<string, number>,
): Promise<void> {
    const previous = Object.fromEntries(
        Object.keys(positionsHash).map(id => [id, articleById(id)?.position ?? 0]),
    );
    applyArticlePositions(positionsHash);
    try {
        const data = await articlesApi.reorder(accountId, portalSlug, positionsHash);
        // Backend giãn lại vị trí — nhận về để lần kéo sau không tính từ số cũ.
        if (data?.positions) applyArticlePositions(data.positions);
    } catch (error) {
        applyArticlePositions(previous);
        throw error;
    }
}

export function resetHelpCenterState(): void {
    state = initialState();
    listeners.forEach(listener => listener());
}
