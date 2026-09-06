import { t } from '../../../i18n';
import SearchResultArticleItem from './SearchResultArticleItem';
import SearchResultSection from './SearchResultSection';
import type { SearchArticle } from '../types';

// Port từ dashboard/modules/search/components/SearchResultArticlesList.vue.
interface SearchResultArticlesListProps {
    articles: SearchArticle[];
    accountId: number;
    query?: string;
    isFetching?: boolean;
    showTitle?: boolean;
    className?: string;
}

export default function SearchResultArticlesList({
    articles,
    accountId,
    query = '',
    isFetching = false,
    showTitle = true,
    className = '',
}: SearchResultArticlesListProps) {
    return (
        <SearchResultSection
            title={t('SEARCH.SECTION.ARTICLES')}
            empty={!articles.length}
            query={query}
            showTitle={showTitle}
            isFetching={isFetching}
            className={className}
        >
            {articles.length ? (
                <ul className="space-y-3 list-none">
                    {articles.map(article => (
                        <li key={article.id}>
                            <SearchResultArticleItem
                                id={article.id}
                                title={article.title}
                                description={article.description}
                                content={article.content}
                                portalSlug={article.portalSlug}
                                locale={article.locale}
                                accountId={accountId}
                                category={article.categoryName}
                                status={article.status}
                                updatedAt={article.updatedAt}
                            />
                        </li>
                    ))}
                </ul>
            ) : null}
        </SearchResultSection>
    );
}
