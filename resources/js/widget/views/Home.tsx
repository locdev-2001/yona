import { useMemo } from 'react';

import { useWidgetState } from '../store/hooks';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import TeamAvailability from '../components/TeamAvailability';

// Port từ widget/views/Home.vue (ArticleContainer của help center thuộc nhóm D).
export default function Home() {
    const agents = useWidgetState(state => state.agents);
    const conversationSize = useWidgetState(state => Object.keys(state.conversations).length);
    const channelConfig = useWidgetState(state => state.channelConfig);

    const availableAgents = useMemo(
        () => agents.filter(agent => agent.availability_status === 'online'),
        [agents],
    );

    // configMixin#shouldShowPreChatForm — form tiền chat thuộc C3, ở đây chỉ rẽ nhánh.
    const preChatFields = channelConfig?.preChatFormOptions?.pre_chat_fields ?? [];
    const shouldShowPreChatForm =
        Boolean(channelConfig?.preChatFormEnabled) && preChatFields.some(field => field.enabled);

    const startConversation = () => {
        if (shouldShowPreChatForm && !conversationSize) {
            replaceRoute(WIDGET_ROUTES.PRECHAT_FORM);
            return;
        }
        replaceRoute(WIDGET_ROUTES.MESSAGES);
    };

    return (
        <div className="z-50 flex flex-col justify-end flex-1 w-full p-4 gap-4">
            <TeamAvailability
                availableAgents={availableAgents}
                hasConversation={Boolean(conversationSize)}
                onStartConversation={startConversation}
            />
        </div>
    );
}
