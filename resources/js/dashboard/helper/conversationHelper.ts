import { MESSAGE_TYPES } from '../conversation/constants';
import type { Conversation, ConversationMessage } from '../conversation/types';

// Port từ dashboard/helper/conversationHelper.js (chỉ getLastMessage cho B3).
function getLastNonActivityMessage(
    messageInStore: ConversationMessage | undefined,
    messageFromApi: ConversationMessage | null | undefined,
): ConversationMessage | null | undefined {
    if (messageInStore && messageFromApi) {
        return messageInStore.created_at >= messageFromApi.created_at ? messageInStore : messageFromApi;
    }
    return messageInStore || messageFromApi;
}

export function getLastMessage(chat: Conversation): ConversationMessage | null | undefined {
    const messages = chat.messages ?? [];
    const lastMessageIncludingActivity = messages[messages.length - 1];

    const nonActivityMessages = messages.filter(message => message.message_type !== MESSAGE_TYPES.ACTIVITY);
    const lastNonActivityMessageInStore = nonActivityMessages[nonActivityMessages.length - 1];

    const lastNonActivityMessageFromApi = chat.last_non_activity_message;

    if (!lastNonActivityMessageInStore && !lastNonActivityMessageFromApi) {
        return lastMessageIncludingActivity;
    }

    return getLastNonActivityMessage(lastNonActivityMessageInStore, lastNonActivityMessageFromApi);
}
