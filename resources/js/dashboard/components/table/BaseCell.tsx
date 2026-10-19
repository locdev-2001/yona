import type { ReactNode } from 'react';

// Port từ dashboard/components/table/BaseCell.vue
export default function BaseCell({ content = '', children }: { content?: string; children?: ReactNode }) {
    const hasContent = Boolean(children) || Boolean(content);

    return (
        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
            {hasContent ? (children ?? content) : <span className="text-n-slate-10"> --- </span>}
        </div>
    );
}
