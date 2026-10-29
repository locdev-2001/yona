import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Thẻ thăm dò ý kiến của kênh, chung mọi kênh (đọc `content_attributes.poll`): câu hỏi, từng lựa
// chọn với số phiếu và thanh tỉ lệ. Bình chọn diễn ra trong ứng dụng của kênh; số phiếu null
// (kênh không cho biết) thì chỉ liệt kê lựa chọn.

interface PollOption {
    id?: string | null;
    text: string;
    votes?: number | null;
}

interface PollCard {
    question?: string | null;
    options?: PollOption[];
    total_votes?: number | null;
}

const PERCENT = 100;

export default function PollBubble() {
    const { content, contentAttributes } = useMessageContext();
    const poll = (contentAttributes.poll ?? {}) as PollCard;
    const options = Array.isArray(poll.options) ? poll.options : [];
    const totalVotes = typeof poll.total_votes === 'number' ? poll.total_votes : null;
    const question = poll.question?.trim() || content?.trim() || t('CONVERSATION.POLL.TITLE');

    return (
        <BaseBubble className="w-[300px] !max-w-full p-3" dataBubbleName="poll">
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex flex-shrink-0 items-center justify-center size-9 rounded-full bg-n-blue-3 text-n-blue-11">
                        <Icon icon="i-lucide-chart-bar-big" className="size-[1.125rem]" />
                    </span>
                    <span className="flex flex-col flex-1 min-w-0 gap-0.5 pt-0.5">
                        <span className="text-xs leading-4 text-n-slate-11">{t('CONVERSATION.POLL.TITLE')}</span>
                        <span className="text-sm font-medium leading-5 text-n-slate-12 break-words">{question}</span>
                    </span>
                </div>
                {options.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                        {options.map((option, index) => {
                            const votes = typeof option.votes === 'number' ? option.votes : null;
                            const share = votes !== null && totalVotes ? Math.round((votes / totalVotes) * PERCENT) : 0;

                            return (
                                <li
                                    key={option.id ?? index}
                                    className="relative overflow-hidden flex items-center justify-between gap-2 min-h-8 px-2.5 py-1.5 rounded-lg border border-n-container bg-n-solid-2"
                                >
                                    <span aria-hidden className="absolute inset-y-0 start-0 bg-n-blue-3" style={{ width: `${share}%` }} />
                                    <span className="relative text-sm leading-5 text-n-slate-12 break-words min-w-0">{option.text}</span>
                                    {votes !== null ? (
                                        <span className="relative flex-shrink-0 text-xs leading-4 text-n-slate-11 tabular-nums">
                                            {t('CONVERSATION.POLL.VOTES', { count: votes })}
                                        </span>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                ) : null}
                <span className="text-xs leading-4 text-n-slate-11">
                    {totalVotes !== null ? `${t('CONVERSATION.POLL.TOTAL_VOTES', { count: totalVotes })} · ` : ''}
                    {t('CONVERSATION.POLL.VOTE_IN_APP')}
                </span>
            </div>
        </BaseBubble>
    );
}
