import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';
import CategoryCard from './CategoryCard';
import categoryContent from '../helper/categoryEmptyStateContent';

// Port từ components-next/HelpCenter/EmptyState/Category/CategoryEmptyState.vue.
// Bản gốc gọi `categoryContent.reverse()` (đảo TẠI CHỖ) cho cột phải: sau lần
// render lại, cột trái nhận mảng đã đảo còn cột phải đảo lần nữa về thứ tự gốc —
// đó là trạng thái oracle hiển thị, nên ở đây gán thẳng cho khớp.
const reversedContent = [...categoryContent].reverse();

interface CategoryEmptyStateProps {
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function CategoryEmptyState({ title = '', subtitle = '', className = '' }: CategoryEmptyStateProps) {
    const renderColumn = (items: typeof categoryContent, keyPrefix: string) => (
        <div className="space-y-4">
            {items.map(category => (
                <CategoryCard
                    key={`${keyPrefix}-${category.id}`}
                    id={category.id}
                    title={category.name}
                    icon={category.icon}
                    description={category.description}
                    articlesCount={category.meta.articles_count || 0}
                    slug={category.slug}
                />
            ))}
        </div>
    );

    return (
        <EmptyStateLayout
            title={title}
            subtitle={subtitle}
            className={className}
            emptyStateItem={
                <div className="grid grid-cols-2 gap-4 p-px">
                    {renderColumn(reversedContent, 'left')}
                    {renderColumn(categoryContent, 'right')}
                </div>
            }
        />
    );
}
