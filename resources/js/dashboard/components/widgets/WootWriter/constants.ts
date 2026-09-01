// Port từ dashboard/components/widgets/WootWriter/constants.js.
// REPLY_EDITOR_MODES đã có ở dashboard/conversation/constants.ts (spine) —
// re-export để call-site đọc giống đường import gốc.
export { REPLY_EDITOR_MODES } from 'dashboard/conversation/constants';

export const CHAR_LENGTH_WARNING = {
    UNDER_50: 'characters remaining',
    NEGATIVE: 'characters over',
} as const;
