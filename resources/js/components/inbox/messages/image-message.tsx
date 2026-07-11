import type { ChatMessage } from '../message-types';
import { TypeLabel } from './type-label';

/** Ảnh + GIF — click mở bản gốc tab mới. */
export function ImageMessage({ msg }: { msg: ChatMessage }) {
    if (!msg.media_url) return <TypeLabel text={msg.type === 'gif' ? '[GIF]' : '[Hình ảnh]'} />;
    return (
        <a href={msg.media_url} target="_blank" rel="noreferrer" className="block">
            <img
                src={msg.media_url}
                alt={msg.body ?? 'image'}
                className="max-h-72 max-w-full rounded-lg object-cover"
                loading="lazy"
                decoding="async"
            />
        </a>
    );
}
