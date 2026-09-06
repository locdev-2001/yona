import { useEffect } from 'react';

import { emitter } from 'shared/helpers/emitter';

import PreChatForm from '../components/PreChat/Form';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import type { PreChatSubmission } from '../helpers/preChatHelpers';

// Port từ widget/views/PreChatForm.vue.
export default function PreChatFormView() {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const activeCampaign = useWidgetState(state => state.activeCampaign);

    useEffect(() => {
        const onConversationCreated = () => replaceRoute(WIDGET_ROUTES.MESSAGES);
        emitter.on(WIDGET_BUS_EVENTS.ON_CONVERSATION_CREATED, onConversationCreated);

        return () => emitter.off(WIDGET_BUS_EVENTS.ON_CONVERSATION_CREATED, onConversationCreated);
    }, []);

    const onSubmit = (submission: PreChatSubmission) => {
        // Có campaign đang chờ: hội thoại do campaign dựng nên form chỉ nhả sự
        // kiện + cập nhật hồ sơ khách, KHÔNG tạo hội thoại thứ hai.
        if (activeCampaign) {
            emitter.emit(WIDGET_BUS_EVENTS.EXECUTE_CAMPAIGN, {
                campaignId: activeCampaign.id,
                customAttributes: submission.conversationCustomAttributes,
            });
            void widgetStore.updateContact({
                email: submission.emailAddress,
                name: submission.fullName,
                phone_number: submission.phoneNumber,
                custom_attributes: submission.contactCustomAttributes,
            });

            return;
        }

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
