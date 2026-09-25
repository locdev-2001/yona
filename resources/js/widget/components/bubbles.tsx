import { t } from '../i18n';
import { CloseIcon, DocumentIcon, DownloadIcon } from './message/icons';
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

const FILE_CARD_CLASS =
    'yona-file-bubble w-[300px] max-w-full rounded-[14px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)]';

function FileTypeBadge() {
    return (
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]">
            <DocumentIcon size={14} />
        </span>
    );
}

// Thẻ tệp đang gửi: giữ tên tệp, "1.2 MB · đang tải 62%", thanh 4px và nút huỷ.
// Hết phần tải lên (100%) thì máy chủ đang xử lý, không còn huỷ được nên ẩn X.
function UploadingFileBubble({
    attachment,
    title,
    size,
    onCancel,
}: {
    attachment: MessageAttachment;
    title: string;
    size: string;
    onCancel?: () => void;
}) {
    const percent = Math.max(0, Math.min(100, Math.round(attachment.progress ?? 0)));
    const canCancel = Boolean(onCancel) && percent < 100;

    return (
        <div className={`${FILE_CARD_CLASS} flex flex-col gap-[9px] px-3 py-[11px]`}>
            <div className="flex items-center gap-[10px]">
                <FileTypeBadge />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium leading-[1.3] text-[var(--yona-chat-ink)]">
                        {title}
                    </span>
                    <span className="block text-[11px] leading-[1.3] text-[var(--yona-chat-ink-muted)]">
                        {t('ATTACHMENT_STATE.UPLOADING_PROGRESS', { size, percent })}
                    </span>
                </span>
                {canCancel ? (
                    <button
                        type="button"
                        aria-label={t('COMPOSER.CANCEL_UPLOAD')}
                        title={t('COMPOSER.CANCEL_UPLOAD')}
                        className="relative -my-2 -me-1.5 flex size-7 flex-none items-center justify-center rounded-full text-[var(--yona-chat-ink-muted)] after:absolute after:-inset-2 after:content-[''] hover:bg-[var(--yona-chat-hover)] active:scale-[0.97]"
                        onClick={onCancel}
                    >
                        <CloseIcon size={13} />
                    </button>
                ) : null}
            </div>
            <span
                role="progressbar"
                aria-label={title}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="block h-1 overflow-hidden rounded-[2px] bg-[var(--yona-chat-track)]"
            >
                <span className="block h-full bg-[var(--yona-chat-accent)]" style={{ width: `${percent}%` }} />
            </span>
        </div>
    );
}

// Thẻ tệp gọn một dòng: tên + kích cỡ + nút tải riêng.
export function FileBubble({
    attachment,
    isInProgress = false,
    onCancelUpload,
}: {
    attachment: MessageAttachment;
    isInProgress?: boolean;
    onCancelUpload?: () => void;
}) {
    const url = attachment.data_url ?? '';
    const title = attachment.file_name || (isInProgress ? t('COMPONENTS.FILE_BUBBLE.UPLOADING') : fileNameOf(url));
    const size = readableFileSize(attachment.file_size);

    if (isInProgress) {
        return <UploadingFileBubble attachment={attachment} title={title} size={size} onCancel={onCancelUpload} />;
    }

    return (
        <div className={`${FILE_CARD_CLASS} flex items-center gap-[10px] px-3 py-[10px]`}>
            <FileTypeBadge />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium leading-[1.3] text-[var(--yona-chat-ink)]">
                    {title}
                </span>
                {size ? (
                    <span className="block text-[11px] leading-[1.3] text-[var(--yona-chat-ink-muted)]">{size}</span>
                ) : null}
            </span>
            {url ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                    aria-label={t('COMPONENTS.FILE_BUBBLE.DOWNLOAD')}
                    title={t('COMPONENTS.FILE_BUBBLE.DOWNLOAD')}
                    className="relative flex size-[30px] flex-none items-center justify-center rounded-[8px] bg-[var(--yona-chat-accent-soft)] text-[var(--yona-chat-accent-ink)] after:absolute after:-inset-[7px] after:content-[''] active:scale-[0.97]"
                >
                    <DownloadIcon />
                </a>
            ) : null}
        </div>
    );
}
