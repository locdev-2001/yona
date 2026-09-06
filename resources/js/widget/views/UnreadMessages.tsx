import { useMemo } from 'react';

import UnreadMessageList from '../components/UnreadMessageList';
import { IFrameHelper } from '../helpers/iframe';
import { getUnreadMessageCount, getUnreadTextMessages } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';

// Port từ widget/views/UnreadMessages.vue.
export default function UnreadMessages() {
    const conversations = useWidgetState(state => state.conversations);
    const userLastSeenAt = useWidgetState(state => state.meta.userLastSeenAt);

    const messages = useMemo(() => Object.values(conversations), [conversations]);
    const unreadMessages = useMemo(
        () => getUnreadTextMessages(messages, userLastSeenAt),
        [messages, userLastSeenAt],
    );

    return (
        <UnreadMessageList
            messages={unreadMessages}
            unreadMessageCount={getUnreadMessageCount(messages, userLastSeenAt)}
            onClose={() => IFrameHelper.sendMessage({ event: 'toggleBubble' })}
        />
    );
}
