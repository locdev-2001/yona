import type { ReactNode } from 'react';

import FileIcon from 'dashboard/components-next/icon/FileIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import { formatBytes } from 'shared/helpers/FileHelper';

import type { ReplyQuoteMedia } from './helpers/replyQuote';

// Nội dung một tin được trích dẫn, dùng chung cho khối trích dẫn trên bong bóng và
// khối "Đang trả lời" của ô soạn: ảnh/video/sticker thu nhỏ trong khung cố định,
// tệp hiện icon + tên + dung lượng, còn lại là chữ do nơi gọi dựng.

interface QuotedMessageProps {
    senderName?: string | null;
    media: ReplyQuoteMedia | null;
    text: ReactNode;
    compact?: boolean;
    className?: string;
}

function MediaThumbnail({ media, sizeClass }: { media: ReplyQuoteMedia; sizeClass: string }) {
    const frameClass = `relative shrink-0 overflow-hidden rounded-md ${sizeClass}`;
    const fitClass = media.kind === 'sticker' ? 'object-contain' : 'object-cover bg-n-alpha-2';

    if (media.imageUrl) {
        return (
            <span className={frameClass}>
                <img src={media.imageUrl} alt="" loading="lazy" className={`size-full ${fitClass}`} data-testid="quoted-media-image" />
                {media.kind === 'video' ? <PlayBadge /> : null}
            </span>
        );
    }

    if (media.videoUrl) {
        return (
            <span className={`${frameClass} bg-n-alpha-2`}>
                <video src={media.videoUrl} preload="metadata" muted playsInline className="size-full object-cover" data-testid="quoted-media-video" />
                <PlayBadge />
            </span>
        );
    }

    return null;
}

function PlayBadge() {
    return (
        <span className="absolute inset-0 grid place-content-center text-white bg-black/20">
            <Icon icon="i-lucide-play" className="size-3.5" />
        </span>
    );
}

function FileSummary({ media }: { media: ReplyQuoteMedia }) {
    return (
        <span className="flex items-center gap-1.5 min-w-0" data-testid="quoted-file">
            <FileIcon fileType={media.extension} className="size-4 shrink-0 text-n-slate-11" />
            <span className="truncate">{media.fileName}</span>
            {media.fileSize ? (
                <span className="shrink-0 tabular-nums text-n-slate-11">{formatBytes(media.fileSize, 1)}</span>
            ) : null}
        </span>
    );
}

export default function QuotedMessage({ senderName, media, text, compact = false, className = '' }: QuotedMessageProps) {
    const isFile = media?.kind === 'file' && Boolean(media.fileName);
    const thumbnail = media && !isFile ? <MediaThumbnail media={media} sizeClass={compact ? 'size-8' : 'size-10'} /> : null;

    return (
        <span className={`flex items-center gap-2 min-w-0 ${className}`} data-testid="quoted-message">
            {thumbnail}
            {media?.kind === 'audio' ? <Icon icon="i-lucide-mic" className="size-4 shrink-0 text-n-slate-11" /> : null}
            <span className="flex flex-col flex-1 min-w-0">
                {senderName ? <span className="block text-xs leading-5 font-medium truncate">{senderName}</span> : null}
                {isFile && media ? <FileSummary media={media} /> : text}
            </span>
        </span>
    );
}
