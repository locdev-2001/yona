import type { ChatMessage } from '../message-types';
import { TypeLabel } from './type-label';

export function VideoMessage({ msg }: { msg: ChatMessage }) {
    if (!msg.media_url) return <TypeLabel text="[Video]" />;
    return <video src={msg.media_url} controls preload="none" className="max-h-72 max-w-full rounded-lg" />;
}
