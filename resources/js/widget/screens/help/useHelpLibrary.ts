import { useEffect, useState } from 'react';

import { loadLibrary, type HelpArticle, type HelpCategory } from '../../api/helpCenter';
import { useWidgetState } from '../../store/hooks';
import type { PortalConfig } from '../../types';

export interface HelpLibrary {
    portal: PortalConfig | null;
    articles: HelpArticle[];
    categories: HelpCategory[];
    status: 'loading' | 'ready' | 'failed';
    retry: () => void;
    /** Tên danh mục của một bài (kết quả tìm kiếm chỉ có category_id). */
    categoryName: (article: HelpArticle) => string | undefined;
}

/** Bài + danh mục của Help Center gắn với hộp thư; các màn Trợ giúp dùng chung một lần tải. */
export function useHelpLibrary(): HelpLibrary {
    const portal = useWidgetState(state => state.channelConfig?.portal ?? null);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<Pick<HelpLibrary, 'articles' | 'categories' | 'status'>>({ articles: [], categories: [], status: 'loading' });

    useEffect(() => {
        if (!portal) return;

        let alive = true;
        setState(current => ({ ...current, status: 'loading' }));
        loadLibrary(portal.slug, portal.defaultLocale)
            .then(({ articles, categories }) => alive && setState({ articles, categories, status: 'ready' }))
            .catch(() => alive && setState(current => ({ ...current, status: 'failed' })));

        return () => {
            alive = false;
        };
    }, [portal, attempt]);

    const categoryName = (article: HelpArticle): string | undefined => {
        const slug = article.category?.slug ?? state.articles.find(known => known.category_id === article.category_id)?.category?.slug;

        return slug ? state.categories.find(category => category.slug === slug)?.name : undefined;
    };

    return { portal, ...state, retry: () => setAttempt(value => value + 1), categoryName };
}
