import { messageTimestamp } from 'shared/helpers/timeHelper';
import { readCallLog } from 'dashboard/calls/callLog';
import BaseBubble from './Base';
import CallMessageBubble from './CallMessage';
import { useMessageContext } from '../provider';

export default function ActivityBubble() {
    const { content, createdAt, contentAttributes } = useMessageContext();
    if (readCallLog(contentAttributes)) return <CallMessageBubble />;

    return (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={messageTimestamp(createdAt, 'LLL d, h:mm a')}
            dataBubbleName="activity"
        >
            <span title={content ?? ''}>{content}</span>
        </BaseBubble>
    );
}
