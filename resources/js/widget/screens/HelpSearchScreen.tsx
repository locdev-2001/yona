import { useEffect, useRef, useState } from 'react';

import { articleSlug, fetchArticles, type HelpArticle } from '../api/helpCenter';
import { HEADER_ACTION_CLASS } from '../components/headerActionClass';
import { t } from '../i18n';
import { pushRoute, WIDGET_ROUTES } from '../router';
import { BackButton, CloseButton } from '../ui/PanelHeader';
import Highlight from './help/Highlight';
import { useHelpLibrary } from './help/useHelpLibrary';
import { startNewConversation } from './navigation';

const DEBOUNCE_MS = 250;

type Search = { query: string; status: 'idle' | 'loading' | 'done' | 'failed'; results: HelpArticle[] };

/** Tìm bài trong Help Center: gõ tới đâu tìm tới đó, đoạn trích tô từ khoá, cuối danh sách mời nhắn nhân viên. */
export default function HelpSearchScreen() {
    const { portal, categoryName } = useHelpLibrary();
    const [input, setInput] = useState('');
    const [search, setSearch] = useState<Search>({ query: '', status: 'idle', results: [] });
    const field = useRef<HTMLInputElement>(null);

    useEffect(() => field.current?.focus(), []);

    useEffect(() => {
        const query = input.trim();
        if (!portal || !query) {
            setSearch({ query: '', status: 'idle', results: [] });

            return;
        }

        // Kết quả của lần gõ cũ về muộn không được đè lần gõ mới.
        let current = true;
        const timer = window.setTimeout(() => {
            setSearch(previous => ({ ...previous, status: 'loading' }));
            fetchArticles(portal.slug, portal.defaultLocale, { query })
                .then(({ payload }) => current && setSearch({ query, status: 'done', results: payload }))
                .catch(() => current && setSearch({ query, status: 'failed', results: [] }));
        }, DEBOUNCE_MS);

        return () => {
            current = false;
            window.clearTimeout(timer);
        };
    }, [input, portal]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <header className="flex h-16 flex-none items-center gap-1 border-b border-[var(--yona-chat-line)] ps-2 pe-3">
                <BackButton />
                <label className="flex h-11 min-w-0 flex-1 items-center gap-[10px] rounded-xl border-2 border-[var(--yona-chat-accent)] px-3">
                    <span className="i-lucide-search size-[18px] flex-none text-[var(--yona-chat-ink-muted)]" />
                    <input
                        ref={field}
                        type="search"
                        enterKeyHint="search"
                        value={input}
                        placeholder={t('HELP.SEARCH')}
                        aria-label={t('HELP.SEARCH')}
                        className="reset-base min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] text-[var(--yona-chat-ink)] outline-none placeholder:text-[var(--yona-chat-ink-muted)] [&::-webkit-search-cancel-button]:hidden"
                        onChange={event => setInput(event.target.value)}
                    />
                    {input ? (
                        <button
                            type="button"
                            className={`${HEADER_ACTION_CLASS} -me-2 !size-8`}
                            aria-label={t('HELP.CLEAR')}
                            onClick={() => {
                                setInput('');
                                field.current?.focus();
                            }}
                        >
                            <span className="i-lucide-x size-4" />
                        </button>
                    ) : null}
                </label>
                <CloseButton />
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar" aria-live="polite" aria-busy={search.status === 'loading'}>
                {search.status === 'done' || search.status === 'failed' ? (
                    <>
                        <p className="m-0 px-5 pb-1 pt-4 text-[13px] text-[var(--yona-chat-ink-soft)]">
                            {search.status === 'failed'
                                ? t('HELP.LOAD_FAILED')
                                : search.results.length
                                  ? t('HELP.RESULTS', { count: search.results.length })
                                  : t('HELP.NO_RESULTS', { query: search.query })}
                        </p>
                        <ul className="m-0 list-none p-0">
                            {search.results.map(article => {
                                const category = categoryName(article);

                                return (
                                    <li key={article.id} className="border-b border-[var(--yona-chat-line)]">
                                        <button
                                            type="button"
                                            className="flex w-full flex-col gap-0.5 px-5 py-3 text-start hover:bg-[var(--yona-chat-hover)]"
                                            onClick={() => pushRoute(WIDGET_ROUTES.ARTICLE, { slug: articleSlug(article) })}
                                        >
                                            {category ? <span className="text-[13px] text-[var(--yona-chat-ink-soft)]">{category}</span> : null}
                                            <span className="text-[16px] font-semibold leading-[22px] text-[var(--yona-chat-ink)]">
                                                <Highlight text={article.title} query={search.query} />
                                            </span>
                                            {article.content ? (
                                                <span className="line-clamp-2 text-[14px] leading-[21px] text-[var(--yona-chat-ink-soft)]">
                                                    <Highlight text={article.content} query={search.query} />
                                                </span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="flex flex-none flex-col items-center gap-3 px-5 py-6">
                            <span className="text-[14px] text-[var(--yona-chat-ink-soft)]">{t('HELP.NOT_FOUND')}</span>
                            <button
                                type="button"
                                className="flex h-10 items-center rounded-full bg-[var(--yona-chat-accent)] px-5 text-[15px] font-medium text-[var(--yona-chat-on-accent)] active:scale-[0.97]"
                                onClick={startNewConversation}
                            >
                                {t('HELP.MESSAGE_TEAM')}
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
