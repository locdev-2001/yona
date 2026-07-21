import type { ChatMessage } from '../message-types';
import { TypeLabel } from './type-label';

export function AudioMessage({ msg }: { msg: ChatMessage }) {
    if (!msg.media_url) return <TypeLabel text="[Tin nhắn thoại]" />;
    return <audio src={msg.media_url} controls className="max-w-[220px]" />;
}
