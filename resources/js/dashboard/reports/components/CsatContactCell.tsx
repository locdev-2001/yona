import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { DashboardPageProps } from '../../types';

// Port từ reports/components/CsatContactCell.vue
interface CsatContactCellProps {
    contact?: { name?: string; thumbnail?: string } | null;
    conversationId: number;
    createdAgo?: string;
    createdAt?: string;
}

export default function CsatContactCell({
    contact = null,
    conversationId,
    createdAgo = '',
    createdAt = '',
}: CsatContactCellProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;

    return (
        <div className="flex items-center gap-2">
            <Avatar src={contact?.thumbnail || ''} name={contact?.name || ''} size={32} roundedFull />
            <div className="flex flex-col gap-0.5">
                <span className="text-sm text-n-slate-12 font-medium">{contact?.name || '—'}</span>
                <div className="flex items-center gap-1 text-xs text-n-slate-10 whitespace-nowrap">
                    <a
                        href={`/app/accounts/${currentAccount.id}/conversations/${conversationId}`}
                        className="flex items-center text-xs gap-0.5 hover:text-n-brand hover:underline"
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                    >
                        <span>#{conversationId}</span>
                    </a>
                    <span>·</span>
                    <span title={createdAt}>{createdAgo}</span>
                </div>
            </div>
        </div>
    );
}
