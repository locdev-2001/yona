import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import NextButton from 'dashboard/components-next/button/Button';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import { emptyListHint } from '../chatlist/emptyListHint';
import { modifierKeyLabel } from 'shared/helpers/kbd';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import OnboardingView from './OnboardingView';
import { useShowAdminOnboarding } from './useShowAdminOnboarding';

// Port từ widgets/conversation/EmptyState/EmptyState.vue + EmptyStateMessage.vue
// + FeaturePlaceholder.vue. uiFlags.isFetching của store inboxes không có (inboxes
// share sẵn qua page props) → chỉ còn loading của chat list.
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
    // Gốc vẽ cứng '⌘'; SME Việt phần lớn dùng Windows/Linux nên phải theo hệ điều hành.
    const modifierKey = modifierKeyLabel();
    const keyShortcuts = [
        { key: 'K', description: t('CONVERSATION.EMPTY_STATE.CMD_BAR') },
        { key: '/', description: t('CONVERSATION.EMPTY_STATE.KEYBOARD_SHORTCUTS') },
    ];

    return (
        <div className="flex flex-col gap-2 mt-9">
            {keyShortcuts.map(keyShortcut => (
                <div key={keyShortcut.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Hotkey customClass="w-8 h-6 text-xs font-medium text-n-slate-12 outline outline-n-container outline-1 bg-n-alpha-3">
                            {modifierKey}
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

function EmptyStateMessage({ message, action }: { message: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <img className="m-4 w-32 block" src="/assets/images/dashboard/no-chat.svg" alt="No Chat" />
            <span className="text-sm text-n-slate-12 font-medium text-center">
                {message}
                <br />
            </span>
            {action}
            <FeaturePlaceholder />
        </div>
    );
}

export default function EmptyState() {
    const { conversations, listLoading, assigneeTab, listMeta, appliedFilters, setAssigneeTab } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const showAdminOnboarding = useShowAdminOnboarding();

    // Cùng quy tắc với cột danh sách (emptyListHint): khung chat không được nói
    // "không có tin nhắn nào từ khách hàng" trong khi khách đang chờ ở tab bên cạnh.
    const hint = emptyListHint(assigneeTab, listMeta, appliedFilters !== null);

    if (showAdminOnboarding) {
        return (
            <div className="h-full overflow-auto w-full">
                <OnboardingView />
            </div>
        );
    }

    return (
        <div className="flex-1 min-w-0 px-0 flex flex-col items-center justify-center h-full bg-n-surface-1">
            {listLoading && <LoadingState message={t('CONVERSATION.LOADING_CONVERSATIONS')} />}
            {!listLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    {!inboxes.length ? (
                        <EmptyStateMessage message={t('CONVERSATION.NO_INBOX_AGENT')} />
                    ) : !conversations.length ? (
                        <EmptyStateMessage
                            message={hint.action ? t(hint.messageKey) : t('CONVERSATION.NO_MESSAGE_1')}
                            action={
                                hint.action ? (
                                    <NextButton
                                        sm
                                        slate
                                        icon="i-lucide-arrow-right"
                                        className="mt-3"
                                        label={t(hint.action.labelKey, { count: hint.action.count })}
                                        onClick={() => setAssigneeTab(hint.action!.tab)}
                                    />
                                ) : null
                            }
                        />
                    ) : (
                        <EmptyStateMessage message={t('CONVERSATION.SELECT_A_CONVERSATION')} />
                    )}
                </div>
            ) : null}
        </div>
    );
}
