import { useEffect, useState, type MouseEvent } from 'react';

import SanitizedHtml from '../../shared/components/SanitizedHtml';
import { fetchArticle, type HelpArticle } from '../api/helpCenter';
import { t } from '../i18n';
import { useRouteEntry } from '../router';
import EmptyState from '../ui/EmptyState';
import PanelHeader from '../ui/PanelHeader';
import { useHelpLibrary } from './help/useHelpLibrary';
import { startNewConversation } from './navigation';

const WORDS_PER_MINUTE = 200;

const formatDate = (iso: string) => {
    const date = new Date(iso);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

// Liên kết trong bài mở tab mới: điều hướng ngay trong iframe là mất khung chat.
function openLinksOutside(event: MouseEvent<HTMLElement>) {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor?.href || anchor.getAttribute('href')?.startsWith('#')) return;

    event.preventDefault();
    window.open(anchor.href, '_blank', 'noopener,noreferrer');
}

/** Đọc một bài Help Center ngay trong khung chat. */
export default function ArticleScreen() {
    const slug = String(useRouteEntry().params?.slug ?? '');
    const { portal, categoryName } = useHelpLibrary();
    const [article, setArticle] = useState<HelpArticle | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!portal || !slug) return;

        let alive = true;
        setFailed(false);
        fetchArticle(portal.slug, slug)
            .then(payload => alive && setArticle(payload))
            .catch(() => alive && setFailed(true));

        return () => {
            alive = false;
        };
    }, [portal, slug]);

    const category = article ? categoryName(article) : undefined;
    const words = (article?.content ?? '').split(/\s+/).filter(Boolean).length;

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={category ? `${t('HELP.TITLE')} · ${category}` : t('HELP.TITLE')} back crumb />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
                {failed ? <EmptyState icon="i-lucide-file-x" title={t('HELP.LOAD_FAILED')} /> : null}
                {article ? (
                    <article className="flex flex-col gap-2 px-6 pb-6 pt-5">
                        <h1 className="m-0 text-[22px] font-semibold leading-[29px] tracking-[-0.01em] text-[var(--yona-chat-ink)] [text-wrap:balance]">
                            {article.title}
                        </h1>
                        <p className="m-0 text-[13px] text-[var(--yona-chat-ink-soft)]">
                            {[
                                article.last_updated_at ? t('HELP.UPDATED', { date: formatDate(article.last_updated_at) }) : null,
                                t('HELP.READ_TIME', { n: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) }),
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        <div onClick={openLinksOutside}>
                            <SanitizedHtml as="div" className="yona-article mt-1" html={article.content_html ?? ''} />
                        </div>
                    </article>
                ) : null}
                {article ? (
                    <div className="mx-6 flex flex-none justify-center border-t border-[var(--yona-chat-line)] py-6">
                        <button type="button" className="text-[15px] font-medium text-[var(--yona-chat-accent-ink)]" onClick={startNewConversation}>
                            {t('HELP.STILL_NEED_HELP')}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
