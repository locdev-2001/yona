// Port từ dashboard/components-next/message/constants.js. Các bộ hằng trùng với
// spine (dashboard/conversation/constants.ts) re-export từ đó — 1 nguồn duy nhất;
// chỉ SENDER_TYPES là riêng của cụm message.
import { MESSAGE_VARIANTS, ORIENTATION } from 'dashboard/conversation/constants';

export { MESSAGE_TYPES, MESSAGE_VARIANTS, MESSAGE_STATUS, ORIENTATION } from 'dashboard/conversation/constants';

export const SENDER_TYPES = {
    CONTACT: 'Contact',
    USER: 'User',
    AGENT_BOT: 'agent_bot',
    CAPTAIN_ASSISTANT: 'captain_assistant',
} as const;

export type MessageVariant = (typeof MESSAGE_VARIANTS)[keyof typeof MESSAGE_VARIANTS];
export type MessageOrientation = (typeof ORIENTATION)[keyof typeof ORIENTATION];
