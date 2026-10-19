import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import type { AccountLabel } from 'dashboard/components-next/Conversation/ConversationCard/CardLabels';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { fetchContactConversations } from 'dashboard/conversation/panelApi';
import type { DashboardPageProps } from '../../types';

// Nhãn của một người = nhãn đã gán cho các hội thoại với người đó (gán ở khung chat).
// Chỉ có một loại nhãn nên hồ sơ chỉ hiện, không gán riêng.
export default function PersonLabels({ contactId }: { contactId: number }) {
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;
    const accountLabels = useLabelsList(accountId) as unknown as AccountLabel[];
    const [labelTitles, setLabelTitles] = useState<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchContactConversations(accountId, contactId)
            .catch(() => [])
            .then(conversations => {
                if (!cancelled) setLabelTitles([...new Set(conversations.flatMap(conversation => conversation.labels ?? []))]);
            });
        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    if (labelTitles === null) return null;

    const labels = (accountLabels ?? []).filter(label => labelTitles.includes(label.title));
    if (labels.length === 0) return <p className="m-0 text-sm text-n-slate-11">{t('FRIENDS.PROFILE.NO_LABELS')}</p>;

    return (
        <ul className="flex flex-wrap gap-1.5 m-0 p-0 list-none">
            {labels.map(label => (
                <li key={label.id} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-n-alpha-2 text-xs text-n-slate-12">
                    <span className="size-2 rounded-sm shrink-0" style={{ backgroundColor: label.color }} />
                    {label.title}
                </li>
            ))}
        </ul>
    );
}
