import type { ChatMessage } from '../message-types';
import { TypeLabel } from './type-label';

export function StickerMessage({ msg }: { msg: ChatMessage }) {
    const sticker = msg.media_meta?.sticker;
    const url = sticker?.url ?? sticker?.thumbnail ?? msg.media_url;
    if (!url) return <TypeLabel text="[Sticker]" />;
    return <img src={url} alt={sticker?.description ?? 'sticker'} className="h-28 w-28 object-contain" loading="lazy" />;
}
