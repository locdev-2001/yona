import { usePage } from '@inertiajs/react';

import LoadingState from 'dashboard/components/widgets/LoadingState';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';

// Port từ widgets/conversation/EmptyState/EmptyState.vue + EmptyStateMessage.vue
// + FeaturePlaceholder.vue. Bỏ ở B3: OnboardingView (nhánh account 0 inbox của
// admin — B1 đã có inbox nên không tới); uiFlags.isFetching của store inboxes
// không có (inboxes share sẵn qua page props) → chỉ còn loading của chat list.
function Hotkey({ children, customClass }: { children: string; customClass: string }) {
    // kbd.hotkey của bản gốc là style global (Hotkey.vue) — inline luôn class tương đương.
    return (
        <kbd
            className={`inline-flex leading-[0.625rem] rounded tracking-wide flex-shrink-0 items-center select-none justify-center p-0.5 min-w-[1rem] uppercase ${customClass}`}
        >
            {children}
        </kbd>
    );
}

function FeaturePlaceholder() {
    const keyShortcuts = [
        { key: 'K', description: t('CONVERSATION.EMPTY_STATE.CMD_BAR') },
        { key: '/', description: t('CONVERSATION.EMPTY_STATE.KEYBOARD_SHORTCUTS') },
    ];

    return (
        <div className="flex flex-col gap-2 mt-9">
            {keyShortcuts.map(keyShortcut => (
                <div key={keyShortcut.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Hotkey customClass="w-8 h-6 text-lg font-medium text-n-slate-12 outline outline-n-container outline-1 bg-n-alpha-3">
                            ⌘
                        </Hotkey>
                        <Hotkey customClass="w-8 h-6 text-xs font-medium text-n-slate-12 outline outline-n-container outline-1 bg-n-alpha-3">
                            {keyShortcut.key}
                        </Hotkey>
                    </div>
                    <span className="text-sm font-medium text-center text-n-slate-12">{keyShortcut.description}</span>
                </div>
            ))}
        </div>
    );
}

function EmptyStateMessage({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <img className="m-4 w-32 hidden dark:block" src="/assets/images/dashboard/no-chat-dark.svg" alt="No Chat dark" />
            <img className="m-4 w-32 block dark:hidden" src="/assets/images/dashboard/no-chat.svg" alt="No Chat" />
            <span className="text-sm text-n-slate-12 font-medium text-center">
                {message}
                <br />
            </span>
            <FeaturePlaceholder />
        </div>
    );
}

export default function EmptyState() {
    const { conversations, listLoading } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    return (
        <div className="flex-1 min-w-0 px-0 flex flex-col items-center justify-center h-full bg-n-surface-1">
            {listLoading && <LoadingState message={t('CONVERSATION.LOADING_CONVERSATIONS')} />}
            {!listLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    {!inboxes.length ? (
                        <EmptyStateMessage message={t('CONVERSATION.NO_INBOX_AGENT')} />
                    ) : !conversations.length ? (
                        <EmptyStateMessage message={t('CONVERSATION.NO_MESSAGE_1')} />
                    ) : (
                        <EmptyStateMessage message={t('CONVERSATION.SELECT_A_CONVERSATION')} />
                    )}
                </div>
            ) : null}
        </div>
    );
}
