import { cn } from '@/lib/utils';
import { Contact, Download, FileText, Phone } from 'lucide-react';
import type { ChatMessage } from './message-types';

/** Media types that look best WITHOUT a colored bubble background (shown bare). */
export function attachmentIsBare(msg: Pick<ChatMessage, 'type'>): boolean {
    return msg.type === 'sticker' || msg.type === 'image' || msg.type === 'gif' || msg.type === 'video';
}

interface Props {
    msg: ChatMessage;
    mine: boolean;
}

/** Renders the media part of a message by type. Returns null for plain text (bubble renders body). */
export function MessageAttachment({ msg, mine }: Props) {
    const meta = msg.media_meta ?? {};

    switch (msg.type) {
        case 'sticker': {
            const url = meta.sticker?.url ?? meta.sticker?.thumbnail ?? msg.media_url;
            return url ? <img src={url} alt="sticker" className="h-28 w-28 object-contain" loading="lazy" /> : <Label text="[Sticker]" />;
        }
        case 'image':
        case 'gif':
            return msg.media_url ? (
                <a href={msg.media_url} target="_blank" rel="noreferrer" className="block">
                    <img
                        src={msg.media_url}
                        alt={msg.body ?? 'image'}
                        className="max-h-72 max-w-full rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                </a>
            ) : (
                <Label text="[Hình ảnh]" />
            );
        case 'video':
            return msg.media_url ? (
                <video src={msg.media_url} controls preload="none" className="max-h-72 max-w-full rounded-lg" />
            ) : (
                <Label text="[Video]" />
            );
        case 'audio':
            return msg.media_url ? <audio src={msg.media_url} controls className="max-w-[220px]" /> : <Label text="[Tin nhắn thoại]" />;
        case 'file': {
            const name = meta.media_filename ?? 'Tệp đính kèm';
            return (
                <a
                    href={msg.media_url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={cn('flex items-center gap-2', mine ? 'text-primary-foreground' : 'text-foreground')}
                >
                    <FileText className="h-5 w-5 shrink-0 opacity-80" />
                    <span className="max-w-[200px] truncate">{name}</span>
                    <Download className="h-4 w-4 shrink-0 opacity-60" />
                </a>
            );
        }
        case 'business_card': {
            const card = meta.business_card ?? {};
            return (
                <div className="flex items-center gap-2">
                    <Contact className="h-5 w-5 shrink-0 opacity-80" />
                    <div className="leading-tight">
                        <div className="font-medium">{card.name ?? 'Danh thiếp'}</div>
                        {card.phone && <div className="text-xs opacity-70">{card.phone}</div>}
                    </div>
                </div>
            );
        }
        case 'call':
            return (
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 opacity-80" />
                    <span>Cuộc gọi</span>
                </div>
            );
        default:
            return null; // text / unknown → bubble renders body
    }
}

function Label({ text }: { text: string }) {
    return <span className="text-xs opacity-70">{text}</span>;
}
