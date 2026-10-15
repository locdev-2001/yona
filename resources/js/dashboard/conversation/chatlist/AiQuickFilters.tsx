import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { fetchConversationMeta } from '../api';
import { AI_QUICK_FILTER } from '../constants';
import type { AiQuickFilter } from '../constants';
import { useConversation } from '../ConversationContext';
import type { AssigneeTab, ConversationListMeta } from '../types';

const COUNT_KEY: Record<AssigneeTab, keyof ConversationListMeta> = {
    all: 'all_count',
    me: 'mine_count',
    unassigned: 'unassigned_count',
};

// Đếm lại khi danh sách đổi, gom các thay đổi dồn dập trong khoảng này.
const RECOUNT_DELAY_MS = 800;

const FILTERS: { value: AiQuickFilter; labelKey: string }[] = [
    { value: '', labelKey: 'CHAT_LIST.AI_FILTERS.ALL' },
    { value: AI_QUICK_FILTER.AUTO_REPLY, labelKey: 'CHAT_LIST.AI_FILTERS.AUTO_REPLY' },
    { value: AI_QUICK_FILTER.HANDED_OFF, labelKey: 'CHAT_LIST.AI_FILTERS.HANDED_OFF' },
];

type AiCounts = Record<Exclude<AiQuickFilter, ''>, number>;

// Bộ lọc nhanh "AI tự động" và "AI chuyển cho người" trên danh sách hội thoại thường.
export default function AiQuickFilters() {
    const { listQuery, assigneeTab, aiFilter, setAiFilter, conversations } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const [counts, setCounts] = useState<AiCounts | null>(null);
    const hasAiAgent = inboxes.some(inbox => Boolean(inbox.ai_agent));
    const baseQuery = useMemo(() => ({ ...listQuery, conversationType: undefined }), [listQuery]);
    const countKey = COUNT_KEY[assigneeTab];

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            Promise.all([
                fetchConversationMeta({ ...baseQuery, conversationType: AI_QUICK_FILTER.AUTO_REPLY }),
                fetchConversationMeta({ ...baseQuery, conversationType: AI_QUICK_FILTER.HANDED_OFF }),
            ])
                .then(([autoReply, handedOff]) => {
                    if (!active) return;
                    setCounts({ ai_auto_reply: autoReply.meta[countKey] ?? 0, ai_handed_off: handedOff.meta[countKey] ?? 0 });
                })
                .catch(() => undefined);
        }, counts === null ? 0 : RECOUNT_DELAY_MS);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
        // Đếm lại theo phạm vi danh sách và mỗi khi danh sách đổi (realtime).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseQuery, countKey, conversations]);

    const hasAiConversations = counts !== null && (counts.ai_auto_reply > 0 || counts.ai_handed_off > 0);
    if (!hasAiAgent && !hasAiConversations && aiFilter === '') return null;

    return (
        <div role="group" aria-label={t('CHAT_LIST.AI_FILTERS.LABEL')} className="flex flex-wrap gap-1.5 px-4 pb-2" data-testid="ai-quick-filters">
            {FILTERS.map(({ value, labelKey }) => {
                const isActive = aiFilter === value;
                const count = value === '' || counts === null ? null : counts[value];

                return (
                    <button
                        key={value || 'all'}
                        type="button"
                        aria-pressed={isActive}
                        className={`h-7 rounded px-2.5 text-xs active:scale-[0.97] ${
                            isActive
                                ? value === ''
                                    ? 'bg-n-alpha-2 font-medium text-n-slate-12'
                                    : 'bg-n-violet-3 font-medium text-n-violet-11'
                                : 'bg-n-alpha-1 text-n-slate-11 hover:bg-n-alpha-2'
                        }`}
                        onClick={() => setAiFilter(value)}
                    >
                        {t(labelKey)}
                        {count !== null ? ` · ${count}` : ''}
                    </button>
                );
            })}
        </div>
    );
}
