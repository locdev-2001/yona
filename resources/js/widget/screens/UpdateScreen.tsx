import { useEffect, useState } from 'react';

import { fetchUpdate, type WidgetUpdateItem } from '../api/widget';
import { t } from '../i18n';
import { useRouteEntry } from '../router';
import EmptyState from '../ui/EmptyState';
import PanelHeader from '../ui/PanelHeader';
import { startNewConversation } from './navigation';
import UpdateTag from './updates/UpdateTag';

const formatDate = (unixSeconds: number) => {
    const date = new Date(unixSeconds * 1000);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

/** Chi tiết một tin: ảnh bìa, nội dung, nút hành động của shop và nút hỏi shop. */
export default function UpdateScreen() {
    const id = Number(useRouteEntry().params?.id);
    const [update, setUpdate] = useState<WidgetUpdateItem | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!id) return;

        let alive = true;
        fetchUpdate(id)
            .then(payload => alive && setUpdate(payload))
            .catch(() => alive && setFailed(true));

        return () => {
            alive = false;
        };
    }, [id]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('UPDATES.TITLE')} back crumb />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
                {failed ? <EmptyState icon="i-lucide-cloud-off" title={t('UPDATES.LOAD_FAILED')} /> : null}
                {update ? (
                    <article className="flex flex-col">
                        {update.cover_url ? <img src={update.cover_url} alt="" className="aspect-[2/1] w-full object-cover" /> : null}
                        <div className="flex flex-col gap-3 px-6 pb-6 pt-5">
                            <span className="flex items-center gap-2 text-[13px] text-[var(--yona-chat-ink-soft)]">
                                <UpdateTag tag={update.tag} />
                                {update.published_at ? formatDate(update.published_at) : null}
                            </span>
                            <h1 className="m-0 text-[22px] font-semibold leading-[29px] tracking-[-0.01em] text-[var(--yona-chat-ink)] [text-wrap:balance]">
                                {update.title}
                            </h1>
                            {update.body ? (
                                <p className="m-0 whitespace-pre-line text-[15px] leading-6 text-[var(--yona-chat-ink)] [overflow-wrap:anywhere]">{update.body}</p>
                            ) : null}
                            <div className="mt-2 flex flex-col gap-2">
                                {update.cta ? (
                                    <a
                                        href={update.cta.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--yona-chat-accent)] text-[15px] font-medium text-[var(--yona-chat-on-accent)] no-underline active:scale-[0.97]"
                                    >
                                        {update.cta.label || update.cta.url}
                                        <span className="i-lucide-external-link size-4" />
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    className="flex h-11 items-center justify-center rounded-full border border-[var(--yona-chat-line-field)] text-[15px] font-medium text-[var(--yona-chat-ink)] active:scale-[0.97]"
                                    onClick={startNewConversation}
                                >
                                    {t('UPDATES.ASK')}
                                </button>
                            </div>
                        </div>
                    </article>
                ) : null}
            </div>
        </div>
    );
}
