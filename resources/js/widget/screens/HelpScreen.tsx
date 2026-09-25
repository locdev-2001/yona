import { articleSlug } from '../api/helpCenter';
import { t } from '../i18n';
import { pushRoute, WIDGET_ROUTES } from '../router';
import EmptyState from '../ui/EmptyState';
import PanelHeader from '../ui/PanelHeader';
import Row from '../ui/Row';
import { useHelpLibrary } from './help/useHelpLibrary';
import { startNewConversation } from './navigation';

const POPULAR_ARTICLES = 3;

/** Tab Trợ giúp: ô tìm, bài hay được hỏi (nhiều lượt xem nhất), danh mục. */
export default function HelpScreen() {
    const { articles, categories, status, retry } = useHelpLibrary();
    const popular = [...articles].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, POPULAR_ARTICLES);
    const withArticles = categories.filter(category => (category.meta?.articles_count ?? 0) > 0);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('HELP.TITLE')} />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
                <div className="flex-none border-b border-[var(--yona-chat-line)] px-5 py-3">
                    <button
                        type="button"
                        className="flex h-11 w-full items-center gap-[10px] rounded-xl bg-[var(--yona-chat-field)] px-[14px] text-start text-[15px] text-[var(--yona-chat-ink-muted)]"
                        onClick={() => pushRoute(WIDGET_ROUTES.HELP_SEARCH)}
                    >
                        <span className="i-lucide-search size-[18px]" />
                        {t('HELP.SEARCH')}
                    </button>
                </div>

                {status === 'failed' ? (
                    <EmptyState
                        icon="i-lucide-cloud-off"
                        title={t('HELP.LOAD_FAILED')}
                        action={
                            <button type="button" className="font-medium text-[var(--yona-chat-accent-ink)]" onClick={retry}>
                                {t('MESSAGE_LIST.RETRY')}
                            </button>
                        }
                    />
                ) : null}

                {status === 'ready' && !articles.length ? (
                    <EmptyState
                        icon="i-lucide-book-open"
                        title={t('HELP.EMPTY_TITLE')}
                        body={t('HELP.EMPTY_BODY')}
                        action={
                            <button type="button" className="font-medium text-[var(--yona-chat-accent-ink)]" onClick={startNewConversation}>
                                {t('HELP.MESSAGE_TEAM')}
                            </button>
                        }
                    />
                ) : null}

                {popular.length ? (
                    <section className="flex flex-none flex-col px-5 pt-4">
                        <h2 className="m-0 pb-1 text-[13px] font-semibold text-[var(--yona-chat-ink)]">{t('HELP.POPULAR')}</h2>
                        {popular.map(article => (
                            <Row key={article.id} divider={false} onClick={() => pushRoute(WIDGET_ROUTES.ARTICLE, { slug: articleSlug(article) })}>
                                <span className="i-lucide-file-text size-[18px] flex-none text-[var(--yona-chat-ink-soft)]" />
                                <span className="flex-1">{article.title}</span>
                            </Row>
                        ))}
                    </section>
                ) : null}

                {withArticles.length ? (
                    <section className="flex flex-none flex-col pt-4">
                        <h2 className="m-0 px-5 pb-2 text-[13px] font-semibold text-[var(--yona-chat-ink)]">{t('HELP.CATEGORIES')}</h2>
                        <ul className="m-0 list-none border-t border-[var(--yona-chat-line)] p-0">
                            {withArticles.map(category => (
                                <li key={category.slug} className="border-b border-[var(--yona-chat-line)]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-3 px-5 py-3 text-start hover:bg-[var(--yona-chat-hover)]"
                                        onClick={() => pushRoute(WIDGET_ROUTES.HELP_CATEGORY, { slug: category.slug })}
                                    >
                                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="text-[15px] font-semibold text-[var(--yona-chat-ink)]">{category.name}</span>
                                            {category.description ? (
                                                <span className="truncate text-[13px] text-[var(--yona-chat-ink-soft)]">{category.description}</span>
                                            ) : null}
                                        </span>
                                        <span className="i-lucide-chevron-right size-4 text-[var(--yona-chat-ink-muted)]" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
            </div>
        </div>
    );
}
