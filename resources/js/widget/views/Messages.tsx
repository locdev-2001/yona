import { useEffect } from 'react';

import ChatEmptyState from '../components/ChatEmptyState';
import ChatFooter from '../components/ChatFooter';
import { useInboxAvailability } from '../components/Availability';
import OutOfHoursNotice from '../components/OutOfHoursNotice';
import ConversationWrap from '../components/ConversationWrap';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';

export default function Messages() {
    const hasMessages = useWidgetState(state => Object.keys(state.conversations).length > 0);
    const agents = useWidgetState(state => state.agents);
    const workingHoursEnabled = useWidgetState(state => Boolean(state.channelConfig?.workingHoursEnabled));
    const { isInWorkingHours } = useInboxAvailability(agents.filter(agent => agent.availability_status === 'online'));
    const isOutOfHours = workingHoursEnabled && !isInWorkingHours;

    useEffect(() => {
        void widgetStore.setUserLastSeen();
    }, []);

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-b-lg bg-[var(--yona-chat-surface)]">
            <div className="flex flex-1 min-h-0 overflow-auto">
                {hasMessages ? <ConversationWrap /> : isOutOfHours ? <OutOfHoursNotice /> : <ChatEmptyState />}
            </div>
            <ChatFooter onStartNewConversation={() => replaceRoute(WIDGET_ROUTES.PRECHAT_FORM)} />
        </div>
    );
}
