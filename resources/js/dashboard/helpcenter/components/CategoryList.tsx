import { useEffect, useState } from 'react';

import CategoryCard from './CategoryCard';
import type { Category } from '../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/CategoryList.vue
// (vuedraggable → kéo thả HTML5 gốc, cùng cây DOM lưới hai cột).
interface CategoryListProps {
    categories: Category[];
    disableDrag?: boolean;
    onClick: (slug: string) => void;
    onAction: (payload: { action: string; value: string | number; id: number; category: Category }) => void;
    onReorder: (positions: Record<string, number>) => void;
}

export default function CategoryList({
    categories,
    disableDrag = false,
    onClick,
    onAction,
    onReorder,
}: CategoryListProps) {
    const [localCategories, setLocalCategories] = useState<Category[]>(categories);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => setLocalCategories(categories), [categories]);

    const dragEnabled = !disableDrag && localCategories.length > 1;

    // onDragEnd gốc: gán lại danh sách vị trí đã sắp xếp theo thứ tự mới,
    // vị trí null/0 thay bằng index + 1.
    const commitReorder = (items: Category[]) => {
        const sortedPositions = items.map((category, index) => category.position || index + 1).sort((a, b) => a - b);

        onReorder(
            items.reduce<Record<string, number>>((accumulator, category, index) => {
                accumulator[category.id] = sortedPositions[index];

                return accumulator;
            }, {}),
        );
    };

    const onDrop = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const items = [...localCategories];
        const [moved] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, moved);
        setLocalCategories(items);
        setDraggedIndex(null);
        commitReorder(items);
    };

    return (
        <ul role="list" className="grid w-full h-full grid-cols-1 gap-4 md:grid-cols-2">
            {localCategories.map((category, index) => (
                <li
                    key={category.id}
                    className="list-none"
                    draggable={dragEnabled}
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={event => {
                        if (dragEnabled) event.preventDefault();
                    }}
                    onDrop={() => onDrop(index)}
                >
                    <CategoryCard
                        id={category.id}
                        title={category.name}
                        icon={category.icon}
                        iconColor={category.icon_color}
                        description={category.description}
                        articlesCount={category.meta?.articles_count || 0}
                        slug={category.slug}
                        className={dragEnabled ? 'cursor-grab' : ''}
                        onClick={onClick}
                        onAction={payload => onAction({ ...payload, category })}
                    />
                </li>
            ))}
        </ul>
    );
}
