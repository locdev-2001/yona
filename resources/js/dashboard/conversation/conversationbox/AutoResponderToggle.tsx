import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';
import { autoResponderView, useFloorClock } from '../autoResponder';
import type { AutoResponderStatus } from '../autoResponder';
import { useConversation } from '../ConversationContext';

// Quá ngưỡng này mà máy chủ chưa trả lời thì công tắc hiện vòng quay.
const BUSY_INDICATOR_DELAY_MS = 300;

const AI_AGENTS_SETTINGS_PATH = 'settings/ai-agents';

// Mã lỗi 422 của máy chủ khi kênh không có AI trả lời được.
const NO_REPLYING_AI_AGENT = 'no_replying_ai_agent';

const ACTIVE_STATUSES: AutoResponderStatus[] = ['on', 'replying'];

// Công tắc "AI tự động" ở đầu khung hội thoại. Đọc trạng thái từ chính hội thoại
// (`auto_responder`, `floor_held_until`) và AI của kênh trong prop `inboxes`.
export default function AutoResponderToggle({ compact = false }: { compact?: boolean }) {
    const { accountId, selectedConversation, setAutoResponder } = useConversation();
    const { inboxes = [], currentAccountUser } = usePage<DashboardPageProps>().props;
    const now = useFloorClock(selectedConversation);
    const [pending, setPending] = useState<boolean | null>(null);
    const [showBusy, setShowBusy] = useState(false);
    const busyTimerRef = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (busyTimerRef.current !== null) window.clearTimeout(busyTimerRef.current);
        },
        [],
    );

    if (!selectedConversation) return null;

    const inboxAiAgent = inboxes.find(inbox => inbox.id === selectedConversation.inbox_id)?.ai_agent ?? null;
    const view = autoResponderView(selectedConversation, inboxAiAgent, now);
    const isAdministrator = currentAccountUser?.role === 'administrator';
    const settingsUrl = accountScopedUrl(accountId, AI_AGENTS_SETTINGS_PATH);
    const isActive = ACTIVE_STATUSES.includes(view.status);
    // Không bật được khi kênh chưa có AI sẵn sàng; đang bật thì luôn tắt được.
    const isLocked = pending !== null || (!view.enabled && (view.status === 'unassigned' || view.status === 'agent_off'));

    const toggle = async () => {
        if (isLocked) return;
        const next = !view.enabled;
        setPending(next);
        busyTimerRef.current = window.setTimeout(() => setShowBusy(true), BUSY_INDICATOR_DELAY_MS);
        try {
            await setAutoResponder(next);
        } catch (error) {
            reportToggleError(error);
        } finally {
            if (busyTimerRef.current !== null) window.clearTimeout(busyTimerRef.current);
            busyTimerRef.current = null;
            setShowBusy(false);
            setPending(null);
        }
    };

    // Ca hiếm: AI vừa bị gỡ khỏi kênh ở máy khác nên máy chủ từ chối bật.
    const reportToggleError = (error: unknown) => {
        if (error instanceof ApiError && error.body?.error === NO_REPLYING_AI_AGENT) {
            useAlert(
                t('CONVERSATION.AUTO_RESPONDER.ENABLE_UNAVAILABLE'),
                isAdministrator
                    ? { message: t('CONVERSATION.AUTO_RESPONDER.ASSIGN_LINK'), onClick: () => router.visit(settingsUrl) }
                    : undefined,
            );
            return;
        }
        useAlert(parseApiErrorMessage(error) || t('CONVERSATION.AUTO_RESPONDER.TOGGLE_ERROR'));
    };

    const label = (() => {
        if (showBusy) return t(pending ? 'CONVERSATION.AUTO_RESPONDER.TURNING_ON' : 'CONVERSATION.AUTO_RESPONDER.TURNING_OFF');
        if (view.status === 'replying') return t('CONVERSATION.AUTO_RESPONDER.REPLYING', { name: view.aiAgentName ?? '' });
        if (view.status === 'on') return t('CONVERSATION.AUTO_RESPONDER.LABEL_WITH_AGENT', { name: view.aiAgentName ?? '' });
        if (view.status === 'agent_off' && view.enabled) {
            return t('CONVERSATION.AUTO_RESPONDER.LABEL_AGENT_OFF', { name: view.aiAgentName ?? '' });
        }

        return t('CONVERSATION.AUTO_RESPONDER.LABEL');
    })();

    const hint = (() => {
        switch (view.status) {
            case 'unassigned':
                return t('CONVERSATION.AUTO_RESPONDER.HINT_UNASSIGNED');
            case 'agent_off':
                return t(view.enabled ? 'CONVERSATION.AUTO_RESPONDER.HINT_AGENT_OFF' : 'CONVERSATION.AUTO_RESPONDER.HINT_AGENT_OFF_IDLE', {
                    name: view.aiAgentName ?? '',
                });
            case 'off':
                return t('CONVERSATION.AUTO_RESPONDER.HINT_OFF', { name: view.aiAgentName ?? '' });
            case 'on':
                return t('CONVERSATION.AUTO_RESPONDER.HINT_ON', { name: view.aiAgentName ?? '' });
            default:
                return t('CONVERSATION.AUTO_RESPONDER.HINT_REPLYING');
        }
    })();

    const switchLabel = (() => {
        if (view.status === 'agent_off' && view.enabled) return t('CONVERSATION.AUTO_RESPONDER.AGENT_OFF_ARIA');
        if (isLocked && !view.enabled) return t('CONVERSATION.AUTO_RESPONDER.UNAVAILABLE');

        return t(view.enabled ? 'CONVERSATION.AUTO_RESPONDER.TURN_OFF' : 'CONVERSATION.AUTO_RESPONDER.TURN_ON');
    })();

    const trackClass = (() => {
        if (isLocked && !view.enabled) return 'bg-n-slate-5';
        if (view.status === 'agent_off' && view.enabled) return 'bg-n-violet-6';
        return view.enabled ? 'bg-n-violet-9' : 'bg-n-slate-7';
    })();

    return (
        <div
            data-testid="auto-responder-toggle"
            title={hint}
            aria-busy={showBusy}
            className={`flex h-9 min-w-0 flex-shrink items-center gap-2 rounded px-2.5 ${isActive ? 'bg-n-violet-3' : 'bg-n-alpha-1'}`}
        >
            {showBusy ? (
                <span className="i-lucide-loader-circle size-4 flex-shrink-0 animate-spin text-n-slate-11" aria-hidden />
            ) : (
                <span className={`i-lucide-bot size-4 flex-shrink-0 ${isActive ? 'text-n-violet-11' : 'text-n-slate-11'}`} aria-hidden />
            )}
            {compact ? null : (
                <span className={`truncate text-sm ${isActive ? 'font-medium text-n-violet-11' : 'text-n-slate-12'}`}>{label}</span>
            )}
            {view.status === 'unassigned' && !view.enabled && isAdministrator && !compact ? (
                <a href={settingsUrl} className="flex-shrink-0 text-xs text-n-blue-11 hover:underline">
                    {t('CONVERSATION.AUTO_RESPONDER.ASSIGN_LINK')}
                </a>
            ) : null}
            <button
                type="button"
                role="switch"
                aria-checked={view.enabled}
                aria-label={switchLabel}
                aria-disabled={isLocked}
                title={hint}
                className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-150 ${trackClass} ${
                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
                }`}
                onClick={() => void toggle()}
            >
                <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform duration-150 ${
                        view.enabled ? 'translate-x-4' : 'translate-x-0'
                    } start-0.5`}
                />
            </button>
        </div>
    );
}
