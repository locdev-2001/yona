import { useCallback, useEffect, useState } from 'react';

import { fetchUpdates, type WidgetUpdateItem } from '../api/widget';
import { relativeTime } from '../helpers/relativeTime';
import { t } from '../i18n';
import { pushRoute, WIDGET_ROUTES } from '../router';
import { useWidgetState } from '../store/hooks';
import EmptyState from '../ui/EmptyState';
import PanelHeader from '../ui/PanelHeader';
import UpdateTag from './updates/UpdateTag';

type State = { items: WidgetUpdateItem[]; page: number; hasMore: boolean; status: 'loading' | 'ready' | 'failed' };

const CARD = 'overflow-hidden rounded-2xl border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-start shadow-[var(--yona-chat-shadow-chip)]';

/** Tab Cập nhật: tin shop đăng (khuyến mãi, hàng mới, thông báo), mới nhất trước. Tin đầu là thẻ lớn. */
export default function UpdatesScreen() {
    const shopName = useWidgetState(state => state.channelConfig?.websiteName ?? '');
    const hasSession = useWidgetState(state => Boolean(state.channelConfig));
    const [state, setState] = useState<State>({ items: [], page: 0, hasMore: false, status: 'loading' });

    const load = useCallback((page: number) => {
        setState(current => ({ ...current, status: 'loading' }));
        fetchUpdates(page)
            .then(({ payload, meta }) =>
                setState(current => ({
                    items: page === 1 ? payload : [...current.items, ...payload.filter(item => !current.items.some(known => known.id === item.id))],
                    page,
                    hasMore: meta.has_more,
                    status: 'ready',
                })),
            )
            .catch(() => setState(current => ({ ...current, status: 'failed' })));
    }, []);

    useEffect(() => {
        if (hasSession) load(1);
    }, [hasSession, load]);

    const [featured, ...rest] = state.items;
    const open = (item: WidgetUpdateItem) => pushRoute(WIDGET_ROUTES.UPDATE, { id: item.id });

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('UPDATES.TITLE')} />
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 no-scrollbar">
                {state.status === 'failed' && !state.items.length ? (
                    <EmptyState
                        icon="i-lucide-cloud-off"
                        title={t('UPDATES.LOAD_FAILED')}
                        action={
                            <button type="button" className="font-medium text-[var(--yona-chat-accent-ink)]" onClick={() => load(1)}>
                                {t('MESSAGE_LIST.RETRY')}
                            </button>
                        }
                    />
                ) : null}

                {state.status === 'ready' && !state.items.length ? (
                    <EmptyState icon="i-lucide-megaphone" title={t('UPDATES.EMPTY_TITLE')} body={t('UPDATES.EMPTY_BODY', { name: shopName })} />
                ) : null}

                {featured ? (
                    <button type="button" className={`${CARD} flex flex-none flex-col`} onClick={() => open(featured)}>
                        {featured.cover_url ? <img src={featured.cover_url} alt="" className="aspect-[2.4/1] w-full object-cover" /> : null}
                        <span className="flex flex-col gap-1.5 p-4">
                            <span className="flex items-center gap-2 text-[13px] text-[var(--yona-chat-ink-soft)]">
                                <UpdateTag tag={featured.tag} />
                                {relativeTime(featured.published_at)}
                            </span>
                            <span className="text-[16px] font-semibold leading-[22px] text-[var(--yona-chat-ink)]">{featured.title}</span>
                            {featured.excerpt ? (
                                <span className="line-clamp-2 text-[14px] leading-[21px] text-[var(--yona-chat-ink-soft)]">{featured.excerpt}</span>
                            ) : null}
                        </span>
                    </button>
                ) : null}

                {rest.map(item => (
                    <button key={item.id} type="button" className={`${CARD} flex min-h-16 flex-none items-stretch`} onClick={() => open(item)}>
                        {item.cover_url ? <img src={item.cover_url} alt="" className="w-24 flex-none object-cover" /> : null}
                        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-3">
                            <span className="flex items-center gap-2 text-[13px] text-[var(--yona-chat-ink-soft)]">
                                <UpdateTag tag={item.tag} />
                                {relativeTime(item.published_at)}
                            </span>
                            <span className="line-clamp-2 text-[15px] font-semibold leading-[21px] text-[var(--yona-chat-ink)]">{item.title}</span>
                        </span>
                    </button>
                ))}

                {state.hasMore ? (
                    <button
                        type="button"
                        className="mx-auto flex-none py-2 text-[14px] font-medium text-[var(--yona-chat-accent-ink)]"
                        disabled={state.status === 'loading'}
                        onClick={() => load(state.page + 1)}
                    >
                        {t('MESSAGE_LIST.LOAD_MORE')}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
