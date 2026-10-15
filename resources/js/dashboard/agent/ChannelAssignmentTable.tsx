import { t } from '../../i18n';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import SelectInput from 'dashboard/components-next/select/Select';
import type { AiAgent, AiAgentInbox } from './types';

// Giá trị của "Không dùng AI" trong ô chọn (option không nhận value rỗng làm lựa chọn thật).
export const NO_AI_VALUE = 'none';

interface ChannelAssignmentTableProps {
    inboxes: AiAgentInbox[];
    aiAgents: AiAgent[];
    savingInboxId: number | null;
    onChange: (inbox: AiAgentInbox, aiAgentId: number | null) => void;
}

// Bảng "AI của từng kênh": hai cột, chọn AI ngay trong dòng, lưu ngay khi chọn.
export default function ChannelAssignmentTable({ inboxes, aiAgents, savingInboxId, onChange }: ChannelAssignmentTableProps) {
    const options = [
        ...aiAgents.map(aiAgent => ({ value: String(aiAgent.id), label: aiAgent.name })),
        { value: NO_AI_VALUE, label: t('AI_AGENTS.CHANNELS.NONE') },
    ];

    return (
        <section className="panel-surface flex flex-col rounded-xl p-2" aria-labelledby="ai-agent-channels-title">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-2">
                <h2 id="ai-agent-channels-title" className="m-0 text-base font-medium text-n-slate-12">
                    {t('AI_AGENTS.CHANNELS.TITLE')}
                </h2>
                <span className="text-xs text-n-slate-11">{t('AI_AGENTS.CHANNELS.HINT')}</span>
            </div>
            {inboxes.length === 0 ? (
                <p className="m-0 px-4 py-3 text-sm text-n-slate-11">{t('AI_AGENTS.CHANNELS.EMPTY')}</p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="w-1/2 px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-n-slate-11">
                                {t('AI_AGENTS.CHANNELS.COLUMN_CHANNEL')}
                            </th>
                            <th className="px-4 py-2 text-start text-xs font-medium uppercase tracking-wide text-n-slate-11">
                                {t('AI_AGENTS.CHANNELS.COLUMN_AI')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {inboxes.map(inbox => (
                            <tr key={inbox.id} className="hover:bg-n-surface-hover">
                                <td className="rounded-s px-4 py-2.5">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <ChannelIcon inbox={inbox} className="size-6 flex-shrink-0" />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm text-n-slate-12">{inbox.name}</span>
                                            {inbox.platform?.name ? (
                                                <span className="truncate text-xs text-n-slate-11">{inbox.platform.name}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </td>
                                <td className="rounded-e px-4 py-2.5">
                                    <SelectInput
                                        className="!w-full [&_select]:w-full"
                                        aria-label={t('AI_AGENTS.CHANNELS.SELECT_LABEL', { name: inbox.name })}
                                        value={inbox.ai_agent_id === null ? NO_AI_VALUE : String(inbox.ai_agent_id)}
                                        options={options}
                                        disabled={savingInboxId === inbox.id}
                                        onChange={value => onChange(inbox, value === NO_AI_VALUE ? null : Number(value))}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <p className="m-0 px-4 pb-2 pt-1 text-xs text-n-slate-11">{t('AI_AGENTS.CHANNELS.FOOTNOTE')}</p>
        </section>
    );
}
