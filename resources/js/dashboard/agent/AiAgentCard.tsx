import { t } from '../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import Switch from 'dashboard/components-next/switch/Switch';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { AiAgent, AiAgentInbox } from './types';

interface AiAgentCardProps {
    aiAgent: AiAgent;
    inboxes: AiAgentInbox[];
    onToggle: (enabled: boolean) => void;
    onEdit: () => void;
}

// Thẻ một nhân viên AI: ai, đang bật hay tắt, trả lời ở kênh nào. Kênh hiện bằng
// logo + tên, không đếm số kênh.
export default function AiAgentCard({ aiAgent, inboxes, onToggle, onEdit }: AiAgentCardProps) {
    const channels = inboxes.filter(inbox => aiAgent.inbox_ids.includes(inbox.id));
    const summary = aiAgent.persona?.split('\n')[0]?.trim() ?? '';

    return (
        <article className="panel-surface flex flex-col gap-3.5 rounded-xl p-4" data-testid="ai-agent-card">
            <div className="flex items-center gap-3">
                <Avatar name={aiAgent.name} src={aiAgent.avatar_url} seed={avatarSeed('ai_agent', aiAgent.id)} size={40} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-n-slate-12">{aiAgent.name}</span>
                    {summary ? <span className="truncate text-xs text-n-slate-11" title={summary}>{summary}</span> : null}
                </div>
                <Switch
                    value={aiAgent.enabled}
                    ariaLabel={t(aiAgent.enabled ? 'AI_AGENTS.CARD.TURN_OFF' : 'AI_AGENTS.CARD.TURN_ON', { name: aiAgent.name })}
                    onChange={onToggle}
                />
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={t('AI_AGENTS.CARD.CHANNELS')}>
                {channels.length === 0 ? (
                    <li className="text-xs text-n-slate-11">{t('AI_AGENTS.CARD.NO_CHANNEL')}</li>
                ) : (
                    channels.map(inbox => (
                        <li
                            key={inbox.id}
                            className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded bg-n-alpha-1 px-2 text-xs text-n-slate-12"
                        >
                            <ChannelIcon inbox={inbox} className="size-4 flex-shrink-0" />
                            <span className="truncate">{inbox.name}</span>
                        </li>
                    ))
                )}
            </ul>
            <button
                type="button"
                className="self-start text-sm text-n-blue-11 hover:text-n-blue-12 active:scale-[0.97]"
                onClick={onEdit}
            >
                {t('AI_AGENTS.CARD.EDIT')}
            </button>
        </article>
    );
}
