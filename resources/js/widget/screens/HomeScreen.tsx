import { useEffect, useState } from 'react';

import { articleSlug, fetchArticles, type HelpArticle } from '../api/helpCenter';
import { useInboxAvailability, replyTimeLabel } from '../components/Availability';
import WidgetAvatar from '../components/WidgetAvatar';
import { relativeTime } from '../helpers/relativeTime';
import { t } from '../i18n';
import { pushRoute, WIDGET_ROUTES } from '../router';
import { conversationList, useConversationList } from '../store/conversationList';
import { useWidgetState } from '../store/hooks';
import { CloseButton, ExpandButton } from '../ui/PanelHeader';
import Row from '../ui/Row';
import OtherChannels from './home/OtherChannels';
import { openConversationScreen, startNewConversation } from './navigation';

const FEATURED_ARTICLES = 3;

/** Màn chủ: chào, tiếp tục hội thoại/nhắn mới, tìm trợ giúp, kênh khác, link — khối nào cũng bật/tắt được. */
export default function HomeScreen() {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const agents = useWidgetState(state => state.agents);
    const { items } = useConversationList();
    const { isOnline, inboxConfig } = useInboxAvailability(agents.filter(agent => agent.availability_status === 'online'));
    const [articles, setArticles] = useState<HelpArticle[]>([]);

    const settings = channelConfig?.widgetSettings;
    const blocks = settings?.home.blocks;
    const portal = channelConfig?.portal ?? null;
    const shopName = channelConfig?.websiteName ?? '';
    const recent = blocks?.recent_conversation ? items[0] : undefined;

    // Danh sách cần phiên khách: đợi /config xong (channelConfig có) mới tải.
    const hasSession = Boolean(channelConfig);
    useEffect(() => {
        if (hasSession) void conversationList.load();
    }, [hasSession]);

    useEffect(() => {
        if (!portal || !blocks?.help) return;

        fetchArticles(portal.slug, portal.defaultLocale, { sort: 'views' })
            .then(({ payload }) => setArticles(payload.slice(0, FEATURED_ARTICLES)))
            .catch(() => setArticles([]));
    }, [portal, blocks?.help]);

    if (!channelConfig || !settings || !blocks) return null;

    const team = agents.slice(0, 3);
    const greeting = settings.appearance.greeting || channelConfig.welcomeTitle || t('HOME.GREETING_DEFAULT', { name: shopName });

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--yona-chat-panel)] no-scrollbar">
            <section className="flex flex-none flex-col gap-[18px] bg-[var(--yona-chat-accent)] pb-16 pe-3 ps-5 pt-3 text-[var(--yona-chat-on-accent)]">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-[10px]">
                        <WidgetAvatar src={channelConfig.avatarUrl} size={36} name={shopName} tone="agent" />
                        <span className="truncate text-[15px] font-semibold">{shopName}</span>
                    </div>
                    <div className="flex gap-1">
                        <ExpandButton tone="on-accent" />
                        <CloseButton tone="on-accent" />
                    </div>
                </div>
                <div className="flex flex-col gap-[10px]">
                    {team.length ? (
                        <div className="flex">
                            {team.map((agent, index) => (
                                <span key={agent.id} className={`rounded-full ring-2 ring-[var(--yona-chat-accent)] ${index ? '-ms-2' : ''}`}>
                                    <WidgetAvatar src={agent.avatar_url} size={36} name={agent.name} tone="agent" />
                                </span>
                            ))}
                        </div>
                    ) : null}
                    <h1 className="m-0 whitespace-pre-line text-[24px] font-semibold leading-[31px] tracking-[-0.01em] [text-wrap:balance]">
                        {t('HOME.GREETING_LINE')}
                        {'\n'}
                        {greeting}
                    </h1>
                </div>
            </section>

            <section className="relative mx-4 -mt-11 flex flex-none flex-col gap-3 rounded-2xl bg-[var(--yona-chat-panel)] px-4 pb-4 pt-1.5 shadow-[var(--yona-chat-shadow-card)]">
                {recent ? (
                    <button
                        type="button"
                        className="flex items-center gap-3 border-b border-[var(--yona-chat-line)] py-[10px] text-start"
                        onClick={() => openConversationScreen(recent.id)}
                    >
                        <WidgetAvatar src={recent.assignee?.avatar_url ?? channelConfig.avatarUrl} size={36} name={recent.assignee?.name ?? shopName} tone="agent" />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[12px] text-[var(--yona-chat-ink-soft)]">
                                {recent.assignee?.name
                                    ? t('HOME.CONTINUE_WITH', { name: recent.assignee.name, time: relativeTime(recent.last_activity_at) })
                                    : t('HOME.CONTINUE', { time: relativeTime(recent.last_activity_at) })}
                            </span>
                            <span className="truncate text-[14px] font-semibold text-[var(--yona-chat-ink)]">{recent.last_message?.preview}</span>
                        </span>
                        <span className="i-lucide-chevron-right size-[18px] text-[var(--yona-chat-ink-muted)]" />
                    </button>
                ) : null}
                <button
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--yona-chat-accent)] text-[15px] font-medium text-[var(--yona-chat-on-accent)] active:scale-[0.97]"
                    onClick={startNewConversation}
                >
                    <span className="i-lucide-send size-[18px]" />
                    {t('HOME.SEND_NEW')}
                </button>
                <span className="flex items-center justify-center gap-2 text-[13px] text-[var(--yona-chat-ink-soft)]">
                    <span className={`size-2 rounded-full ${isOnline ? 'bg-[var(--yona-chat-online-dot)]' : 'bg-[var(--yona-chat-ink-muted)]'}`} />
                    {isOnline ? `${t('HEADER.ONLINE')} · ${replyTimeLabel(inboxConfig.replyTime).toLowerCase()}` : t('HEADER.AWAY')}
                </span>
            </section>

            {portal && blocks.help ? (
                <section className="flex flex-none flex-col gap-[10px] px-5 pb-2 pt-6">
                    <h2 className="m-0 text-[13px] font-semibold text-[var(--yona-chat-ink)]">{t('HOME.FIND_ANSWERS')}</h2>
                    <button
                        type="button"
                        className="flex h-11 items-center gap-[10px] rounded-xl border border-[var(--yona-chat-line-field)] px-[14px] text-start text-[14px] text-[var(--yona-chat-ink-muted)]"
                        onClick={() => pushRoute(WIDGET_ROUTES.HELP_SEARCH)}
                    >
                        <span className="i-lucide-search size-[18px]" />
                        {t('HOME.SEARCH_PLACEHOLDER')}
                    </button>
                    {articles.length ? (
                        <div className="mt-1 flex flex-col">
                            {articles.map(article => (
                                <Row key={article.id} onClick={() => pushRoute(WIDGET_ROUTES.ARTICLE, { slug: articleSlug(article) })}>
                                    <span className="flex-1">{article.title}</span>
                                </Row>
                            ))}
                        </div>
                    ) : null}
                </section>
            ) : null}

            {blocks.other_channels ? <OtherChannels channels={settings.other_channels} shopName={shopName} /> : null}

            {(blocks.custom_links && settings.custom_links.length) || blocks.request ? (
                <section className="flex flex-none flex-col px-5 pb-5 pt-4">
                    {blocks.custom_links
                        ? settings.custom_links.map(link => (
                              <Row key={link.url} href={link.url} trailing={<span className="i-lucide-external-link size-4 text-[var(--yona-chat-ink-muted)]" />}>
                                  <span className="flex-1">{link.label}</span>
                              </Row>
                          ))
                        : null}
                    {blocks.request ? (
                        <Row
                            muted
                            onClick={() => pushRoute(WIDGET_ROUTES.REQUEST)}
                            trailing={
                                <span className="rounded-md bg-[var(--yona-chat-field)] px-2 py-0.5 text-[12px] font-medium">{t('HOME.COMING_SOON')}</span>
                            }
                        >
                            <span className="flex-1">{t('HOME.REQUEST')}</span>
                        </Row>
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}
