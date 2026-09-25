import { t } from '../i18n';
import { switchTab, tabOf, useWidgetRoute, type WidgetTab } from '../router';
import { useConversationList } from '../store/conversationList';
import { useWidgetState } from '../store/hooks';

const TABS: { tab: WidgetTab; icon: string; label: string }[] = [
    { tab: 'home', icon: 'i-lucide-house', label: 'TABS.HOME' },
    { tab: 'messages', icon: 'i-lucide-message-circle', label: 'TABS.MESSAGES' },
    { tab: 'help', icon: 'i-lucide-book-open', label: 'TABS.HELP' },
    { tab: 'updates', icon: 'i-lucide-megaphone', label: 'TABS.UPDATES' },
];

/** Thanh 4 tab dưới đáy các màn gốc. Tab Trợ giúp chỉ có khi hộp thư gắn Help Center. */
export default function TabBar() {
    const active = tabOf(useWidgetRoute());
    const hasPortal = useWidgetState(state => Boolean(state.channelConfig?.portal));
    const unread = useConversationList().items.reduce((sum, item) => sum + item.unread_count, 0);
    const tabs = TABS.filter(({ tab }) => tab !== 'help' || hasPortal);

    return (
        <nav
            aria-label={t('TABS.LABEL')}
            className="grid h-16 flex-none border-t border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)]"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
            {tabs.map(({ tab, icon, label }) => {
                const isActive = active === tab;

                return (
                    <button
                        key={tab}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex flex-col items-center justify-center gap-1 text-[12px] active:scale-[0.97] ${
                            isActive ? 'font-medium text-[var(--yona-chat-ink)]' : 'text-[var(--yona-chat-ink-muted)]'
                        }`}
                        onClick={() => switchTab(tab)}
                    >
                        <span className={`${icon} size-5`} />
                        {t(label)}
                        {tab === 'messages' && unread > 0 ? (
                            <span className="absolute start-[56%] top-2 min-w-4 rounded-full bg-[var(--yona-chat-danger)] px-1 text-center text-[10px] font-medium leading-4 text-white">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </nav>
    );
}
