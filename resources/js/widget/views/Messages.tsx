import { useEffect } from 'react';

import ChatFooter from '../components/ChatFooter';
import ConversationWrap from '../components/ConversationWrap';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import { widgetStore } from '../store/widgetStore';

// Port từ widget/views/Messages.vue
export default function Messages() {
    useEffect(() => {
        void widgetStore.setUserLastSeen();
    }, []);

    return (
        <div className="flex flex-col flex-1 overflow-hidden rounded-b-lg bg-n-slate-2 dark:bg-n-solid-1">
            <div className="flex flex-1 overflow-auto">
                <ConversationWrap />
            </div>
            <ChatFooter onStartNewConversation={() => replaceRoute(WIDGET_ROUTES.PRECHAT_FORM)} />
        </div>
    );
}
