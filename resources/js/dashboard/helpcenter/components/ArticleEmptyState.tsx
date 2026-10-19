import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';
import ArticleCard from './ArticleCard';
import articleContent from '../helper/portalEmptyStateContent';

// Port từ components-next/HelpCenter/EmptyState/Article/ArticleEmptyState.vue.
interface ArticleEmptyStateProps {
    title?: string;
    subtitle?: string;
    showButton?: boolean;
    buttonLabel?: string;
    className?: string;
    onClick?: () => void;
}

export default function ArticleEmptyState({
    title = '',
    subtitle = '',
    showButton = true,
    buttonLabel = '',
    className = '',
    onClick,
}: ArticleEmptyStateProps) {
    return (
        <EmptyStateLayout
            title={title}
            subtitle={subtitle}
            className={className}
            emptyStateItem={
                <div className="grid grid-cols-1 gap-4 p-px overflow-hidden">
                    {articleContent.slice(0, 5).map((article, index) => (
                        <ArticleCard
                            key={`article-${index}`}
                            id={article.id}
                            title={article.title}
                            status={article.status}
                            updatedAt={article.updatedAt}
                            author={{ id: 0, name: '', availableName: article.author.availableName }}
                            category={article.category}
                            views={article.views}
                        />
                    ))}
                </div>
            }
            actions={showButton ? <div><Button label={buttonLabel} icon="i-lucide-plus" onClick={onClick} /></div> : undefined}
        />
    );
}
