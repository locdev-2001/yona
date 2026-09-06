import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';

// Port từ components-next/captain/assistant/BulkSelectBar.vue.
interface BulkSelectBarProps {
    selectedIds: Set<number>;
    allItems: { id: number }[];
    selectAllLabel?: string;
    selectedCountLabel?: string;
    deleteLabel?: string;
    className?: string;
    primaryActions?: ReactNode;
    secondaryActions?: ReactNode;
    actions?: ReactNode;
    defaultActions?: ReactNode;
    onChange: (selectedIds: Set<number>) => void;
    onBulkDelete?: () => void;
}

export default function BulkSelectBar({
    selectedIds,
    allItems,
    selectAllLabel = '',
    selectedCountLabel = '',
    deleteLabel = 'Delete',
    className = '',
    primaryActions,
    secondaryActions,
    actions,
    defaultActions,
    onChange,
    onBulkDelete,
}: BulkSelectBarProps) {
    const visibleItemIds = allItems.map(item => item.id);
    const selectedVisibleCount = visibleItemIds.filter(id => selectedIds.has(id)).length;
    const hasSelected = selectedIds.size > 0;
    const isIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleItemIds.length;
    const allSelected = visibleItemIds.length > 0 && selectedVisibleCount === visibleItemIds.length;

    const toggleAll = () => {
        if (!visibleItemIds.length) return;

        const updated = new Set(selectedIds);
        visibleItemIds.forEach(id => (allSelected ? updated.delete(id) : updated.add(id)));
        onChange(updated);
    };

    if (!hasSelected) {
        return <div className="flex items-center gap-3">{defaultActions}</div>;
    }

    return (
        <div
            className={`flex items-center gap-3 py-1 ltr:pl-3 rtl:pr-3 ltr:pr-4 rtl:pl-4 rounded-lg bg-n-solid-2 outline outline-1 outline-n-container shadow ${className}`.trim()}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Checkbox checked={allSelected} indeterminate={isIndeterminate} onChange={toggleAll} />
                    <span className="text-sm font-medium truncate text-n-slate-12 tabular-nums">{selectAllLabel}</span>
                </div>
                <span className="text-sm text-n-slate-10 truncate tabular-nums">{selectedCountLabel}</span>
                {primaryActions ? <div className="h-4 w-px bg-n-strong" /> : null}
                {primaryActions}
            </div>
            <div className="flex items-center gap-3">
                {secondaryActions}
                {secondaryActions ? <div className="h-4 w-px bg-n-strong" /> : null}
                <div className="flex items-center gap-3">
                    {actions ?? (
                        <Button
                            label={deleteLabel}
                            sm
                            ruby
                            ghost
                            className="!px-1.5"
                            icon="i-lucide-trash"
                            onClick={onBulkDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
