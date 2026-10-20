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

// ATTACHMENT_TYPES/MEDIA_TYPES của constants.js gốc — nguồn duy nhất cho việc
// rẽ nhánh bubble và lọc danh sách gallery.
export const ATTACHMENT_TYPES = {
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    FILE: 'file',
    LOCATION: 'location',
    FALLBACK: 'fallback',
    SHARE: 'share',
    STORY_MENTION: 'story_mention',
    CONTACT: 'contact',
    IG_REEL: 'ig_reel',
    EMBED: 'embed',
    IG_POST: 'ig_post',
    IG_STORY: 'ig_story',
    IG_STORY_REPLY: 'ig_story_reply',
} as const;

export const MEDIA_TYPES: string[] = [
    ATTACHMENT_TYPES.IMAGE,
    ATTACHMENT_TYPES.VIDEO,
    ATTACHMENT_TYPES.AUDIO,
    ATTACHMENT_TYPES.IG_REEL,
];

// Tab "Ảnh/video" ở panel hội thoại: chỉ loại có hình để xếp lưới; âm thanh nằm ở tab Tệp.
export const SHARED_MEDIA_TYPES: string[] = [ATTACHMENT_TYPES.IMAGE, ATTACHMENT_TYPES.VIDEO, ATTACHMENT_TYPES.IG_REEL];

export type AttachmentType = (typeof ATTACHMENT_TYPES)[keyof typeof ATTACHMENT_TYPES];

// Loại đính kèm không phải "tệp tải về" — accordion Attachments bỏ qua chúng.
export const NON_FILE_TYPES: string[] = [
    ATTACHMENT_TYPES.LOCATION,
    ATTACHMENT_TYPES.FALLBACK,
    ATTACHMENT_TYPES.CONTACT,
];

// CONTENT_TYPES của constants.js gốc — những loại có bong bóng riêng.
export const CONTENT_TYPES = {
    INCOMING_EMAIL: 'incoming_email',
    STICKER: 'sticker',
} as const;
