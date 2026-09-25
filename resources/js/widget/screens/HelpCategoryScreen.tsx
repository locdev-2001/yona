import { articleSlug } from '../api/helpCenter';
import { HEADER_ACTION_CLASS } from '../components/headerActionClass';
import { t } from '../i18n';
import { pushRoute, useRouteEntry, WIDGET_ROUTES } from '../router';
import PanelHeader from '../ui/PanelHeader';
import { useHelpLibrary } from './help/useHelpLibrary';

/** Một danh mục Help Center: tên, mô tả, các bài trong danh mục. */
export default function HelpCategoryScreen() {
    const slug = String(useRouteEntry().params?.slug ?? '');
    const { articles, categories } = useHelpLibrary();
    const category = categories.find(entry => entry.slug === slug);
    const inCategory = articles.filter(article => article.category?.slug === slug);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('HELP.TITLE')} back crumb>
                <button
                    type="button"
                    className={HEADER_ACTION_CLASS}
                    aria-label={t('HELP.SEARCH')}
                    title={t('HELP.SEARCH')}
                    onClick={() => pushRoute(WIDGET_ROUTES.HELP_SEARCH)}
                >
                    <span className="i-lucide-search size-[18px]" />
                </button>
            </PanelHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
                {category ? (
                    <div className="flex flex-none flex-col gap-1.5 border-b border-[var(--yona-chat-line)] px-5 pb-5 pt-4">
                        <h1 className="m-0 text-[22px] font-semibold leading-7 tracking-[-0.01em] text-[var(--yona-chat-ink)]">{category.name}</h1>
                        {category.description ? (
                            <p className="m-0 text-[15px] leading-[21px] text-[var(--yona-chat-ink-soft)]">{category.description}</p>
                        ) : null}
                    </div>
                ) : null}
                <ul className="m-0 list-none p-0">
                    {inCategory.map(article => (
                        <li key={article.id} className="border-b border-[var(--yona-chat-line)]">
                            <button
                                type="button"
                                className="flex min-h-[52px] w-full items-center gap-3 px-5 py-3 text-start text-[15px] text-[var(--yona-chat-ink)] hover:bg-[var(--yona-chat-hover)]"
                                onClick={() => pushRoute(WIDGET_ROUTES.ARTICLE, { slug: articleSlug(article) })}
                            >
                                <span className="flex-1">{article.title}</span>
                                <span className="i-lucide-chevron-right size-4 text-[var(--yona-chat-ink-muted)]" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
