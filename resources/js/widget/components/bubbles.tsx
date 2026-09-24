import { t } from '../i18n';
import { DocumentIcon, DownloadIcon } from './message/icons';
import type { MessageAttachment } from '../types';

// Bong bóng đính kèm không phải ảnh (ảnh đi qua lưới ảnh).

export function VideoBubble({ url, onError }: { url: string; onError?: () => void }) {
    return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className="block h-auto w-full max-w-[250px] rounded-[12px]" src={url} controls onError={onError} />
    );
}

export function AudioBubble({ url }: { url: string }) {
    return (
        <audio controls className="h-10 max-w-[250px]">
            <source src={url} />
        </audio>
    );
}

const readableFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileNameOf = (url: string): string => {
    try {
        return decodeURIComponent(url.substring(url.lastIndexOf('/') + 1).split('?')[0]);
    } catch {
        return url;
    }
};

// Thẻ tệp gọn một dòng: tên + kích cỡ + nút tải riêng.
export function FileBubble({ attachment, isInProgress = false }: { attachment: MessageAttachment; isInProgress?: boolean }) {
    const url = attachment.data_url ?? '';
    const title = isInProgress ? t('COMPONENTS.FILE_BUBBLE.UPLOADING') : fileNameOf(url);
    const size = readableFileSize(attachment.file_size);

    return (
        <div className="yona-file-bubble flex max-w-[240px] items-center gap-[10px] rounded-[12px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] py-2 pe-2 ps-[10px]">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]">
                <DocumentIcon />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium leading-[1.35] text-[var(--yona-chat-ink)]">
                    {title}
                </span>
                {size ? (
                    <span className="block text-[11px] leading-[1.3] text-[var(--yona-chat-ink-muted)]">{size}</span>
                ) : null}
            </span>
            {!isInProgress && url ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                    aria-label={t('COMPONENTS.FILE_BUBBLE.DOWNLOAD')}
                    title={t('COMPONENTS.FILE_BUBBLE.DOWNLOAD')}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[var(--yona-chat-ink-soft)]"
                >
                    <DownloadIcon />
                </a>
            ) : null}
        </div>
    );
}
