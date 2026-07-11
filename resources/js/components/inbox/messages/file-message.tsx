import { cn } from '@/lib/utils';
import { Download, FileText } from 'lucide-react';
import type { ChatMessage } from '../message-types';

/** Card tệp đính kèm: icon + tên + đuôi file + nút tải (mở tab mới). */
export function FileMessage({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
    const name = msg.media_meta?.media_filename ?? 'Tệp đính kèm';
    const dotIndex = name.lastIndexOf('.');
    const extension = dotIndex > 0 && dotIndex < name.length - 1 ? name.slice(dotIndex + 1).toUpperCase() : null;

    return (
        <a
            href={msg.media_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className={cn('flex items-center gap-2.5', mine ? 'text-primary-foreground' : 'text-foreground')}
        >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', mine ? 'bg-white/15' : 'bg-background/80')}>
                <FileText className="h-5 w-5 opacity-80" />
            </span>
            <span className="min-w-0 leading-tight">
                <span className="block max-w-[200px] truncate font-medium">{name}</span>
                <span className="block text-xs opacity-70">{extension ? `${extension} · Bấm để tải` : 'Bấm để tải'}</span>
            </span>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
        </a>
    );
}
