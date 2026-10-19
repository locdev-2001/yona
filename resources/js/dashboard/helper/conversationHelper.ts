import { MESSAGE_TYPES } from '../conversation/constants';
import { messageSentAt } from '../conversation/messageTime';
import type { Conversation, ConversationMessage } from '../conversation/types';

export function getLastMessage(chat: Conversation): ConversationMessage | null | undefined {
    return chat.last_non_activity_message;
}

export interface TypingUser {
    id: number;
    name: string | null;
    type?: string;
}

// getTypingUsersText của helper/commons.js: [key i18n, params].
export function getTypingUsersText(users: TypingUser[] = []): [string, Record<string, string | number>] {
    const count = users.length;
    const [firstUser, secondUser] = users;

    if (count === 1) {
        return ['TYPING.ONE', { user: firstUser.name ?? '' }];
    }

    if (count === 2) {
        return ['TYPING.TWO', { user: firstUser.name ?? '', secondUser: secondUser.name ?? '' }];
    }

    return ['TYPING.MULTIPLE', { user: firstUser?.name ?? '', count: count - 1 }];
}
