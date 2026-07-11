import type { ChatMessage } from './message-types';
import { AudioMessage } from './messages/audio-message';
import { BankCardMessage } from './messages/bank-card-message';
import { BusinessCardMessage } from './messages/business-card-message';
import { CallMessage } from './messages/call-message';
import { FileMessage } from './messages/file-message';
import { ImageMessage } from './messages/image-message';
import { StickerMessage } from './messages/sticker-message';
import { VideoMessage } from './messages/video-message';

/** Media types that look best WITHOUT a colored bubble background (shown bare). */
export function attachmentIsBare(msg: Pick<ChatMessage, 'type'>): boolean {
    return msg.type === 'sticker' || msg.type === 'image' || msg.type === 'gif' || msg.type === 'video' || msg.type === 'bank_card';
}

interface Props {
    msg: ChatMessage;
    mine: boolean;
}

/**
 * Dispatcher render media theo loại tin — mỗi loại 1 component riêng trong
 * ./messages/ (channel-agnostic, kênh mới chỉ cần map về cùng type+meta).
 * Trả null cho text (bubble tự render body).
 */
export function MessageAttachment({ msg, mine }: Props) {
    switch (msg.type) {
        case 'sticker':
            return <StickerMessage msg={msg} />;
        case 'image':
        case 'gif':
            return <ImageMessage msg={msg} />;
        case 'video':
            return <VideoMessage msg={msg} />;
        case 'audio':
            return <AudioMessage msg={msg} />;
        case 'file':
            return <FileMessage msg={msg} mine={mine} />;
        case 'business_card':
            return <BusinessCardMessage msg={msg} />;
        case 'bank_card':
            return <BankCardMessage msg={msg} />;
        case 'call':
            return <CallMessage msg={msg} />;
        default:
            return null; // text / unknown → bubble renders body
    }
}
