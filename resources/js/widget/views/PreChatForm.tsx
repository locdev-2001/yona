import { useEffect } from 'react';

import { emitter } from 'shared/helpers/emitter';

import PreChatForm from '../components/PreChat/Form';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import type { PreChatSubmission } from '../helpers/preChatHelpers';

// Port từ widget/views/PreChatForm.vue. Nhánh campaign (activeCampaignId) thuộc
// C4 — ở đây luôn đi nhánh tạo hội thoại mới.
export default function PreChatFormView() {
    const channelConfig = useWidgetState(state => state.channelConfig);

    useEffect(() => {
        const onConversationCreated = () => replaceRoute(WIDGET_ROUTES.MESSAGES);
        emitter.on(WIDGET_BUS_EVENTS.ON_CONVERSATION_CREATED, onConversationCreated);

        return () => emitter.off(WIDGET_BUS_EVENTS.ON_CONVERSATION_CREATED, onConversationCreated);
    }, []);

    const onSubmit = (submission: PreChatSubmission) => {
        widgetStore.clearConversations();
        widgetStore.clearConversationAttributes();
        void widgetStore.createConversation({
            fullName: submission.fullName,
            emailAddress: submission.emailAddress,
            phoneNumber: submission.phoneNumber,
            message: submission.message,
            customAttributes: submission.conversationCustomAttributes,
            contactCustomAttributes: submission.contactCustomAttributes,
        });
    };

    return (
        <div className="flex flex-1 overflow-auto">
            <PreChatForm
                preChatMessage={channelConfig?.preChatFormOptions?.pre_chat_message}
                preChatFields={channelConfig?.preChatFormOptions?.pre_chat_fields ?? []}
                onSubmitPreChat={onSubmit}
            />
        </div>
    );
}
