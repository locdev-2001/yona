import Icon from 'dashboard/components-next/icon/Icon';
import FileCard from 'dashboard/components-next/message/chips/FileCard';
import { uploadProgressByFile } from 'shared/helpers/FileHelper';

import { t } from '../../../i18n';

export interface PendingAttachment {
    currentChatId: number;
    resource: File;
    isPrivate: boolean;
    thumb: string;
    isVoiceMessage?: boolean;
}

export interface UploadProgress {
    loadedBytes: number;
    totalBytes: number;
}

interface AttachmentsPreviewProps {
    attachments: PendingAttachment[];
    className?: string;
    // Có khi tin đang được gửi: tiến trình tải lên của cả yêu cầu.
    uploadProgress?: UploadProgress | null;
    onRemoveAttachment: (attachments: PendingAttachment[]) => void;
}

const isMediaFile = (file: File) => file.type.startsWith('image/') || file.type.startsWith('video/');

const fileExtension = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
};

function RemoveButton({ fileName, disabled, onClick, className }: { fileName: string; disabled: boolean; onClick: () => void; className: string }) {
    return (
        <button
            type="button"
            title={t('COMPONENTS.MEDIA.REMOVE_ATTACHMENT')}
            aria-label={`${t('COMPONENTS.MEDIA.REMOVE_ATTACHMENT')}: ${fileName}`}
            disabled={disabled}
            className={`grid p-0 place-content-center shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
            onClick={onClick}
        >
            <Icon icon="i-lucide-x" className="size-3.5" />
        </button>
    );
}

// Khay đính kèm của ô soạn: ảnh/video hiện thumbnail, tài liệu hiện thẻ tệp; mỗi
// mục có nút bỏ và thanh tiến trình khi đang gửi. Ghi âm có khay riêng.
export default function AttachmentsPreview({
    attachments,
    className = '',
    uploadProgress = null,
    onRemoveAttachment,
}: AttachmentsPreviewProps) {
    const progressByIndex = uploadProgress
        ? uploadProgressByFile(
              uploadProgress.loadedBytes,
              uploadProgress.totalBytes,
              attachments.map((attachment) => attachment.resource.size),
          )
        : null;
    const isUploading = progressByIndex !== null;
    const visibleItems = attachments
        .map((attachment, index) => ({ attachment, index, progress: progressByIndex?.[index] ?? null }))
        .filter(({ attachment }) => !attachment.isVoiceMessage);
    const mediaItems = visibleItems.filter(({ attachment }) => isMediaFile(attachment.resource));
    const fileItems = visibleItems.filter(({ attachment }) => !isMediaFile(attachment.resource));

    if (!visibleItems.length) return null;

    const removeAt = (removedIndex: number) =>
        onRemoveAttachment(attachments.filter((_, index) => index !== removedIndex));

    return (
        <div data-testid="attachment-tray" className={`flex flex-col gap-2 overflow-auto max-h-[12.5rem] ${className}`}>
            <span className="text-xs font-medium text-n-slate-11">
                {t('COMPONENTS.MEDIA.ATTACHMENTS_COUNT', { count: visibleItems.length })}
            </span>
            {mediaItems.length ? (
                <div className="flex flex-wrap gap-2">
                    {mediaItems.map(({ attachment, index, progress }) => (
                        <div
                            key={`${attachment.resource.name}-${index}`}
                            data-testid="pending-media"
                            title={attachment.resource.name}
                            className="relative overflow-hidden rounded-lg size-16 shrink-0 bg-n-alpha-2"
                        >
                            {attachment.resource.type.startsWith('video/') ? (
                                <>
                                    <video src={attachment.thumb} muted playsInline preload="metadata" className="object-cover size-full" />
                                    <span className="absolute inset-0 grid pointer-events-none place-content-center">
                                        <span className="grid rounded-full size-6 place-content-center bg-n-black/50">
                                            <Icon icon="i-lucide-play" className="text-white size-3 ms-px" />
                                        </span>
                                    </span>
                                </>
                            ) : (
                                <img src={attachment.thumb} alt="" className="object-cover size-full" />
                            )}
                            <RemoveButton
                                fileName={attachment.resource.name}
                                disabled={isUploading}
                                className="absolute size-5 top-1 ltr:right-1 rtl:left-1 bg-n-black/60 text-white hover:bg-n-black/80"
                                onClick={() => removeAt(index)}
                            />
                            {progress !== null ? (
                                <div
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(progress * 100)}
                                    className="absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-n-black/40"
                                >
                                    <div className="h-full bg-white transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
            {fileItems.length ? (
                <div className="flex flex-col gap-1.5">
                    {fileItems.map(({ attachment, index, progress }) => (
                        <FileCard
                            key={`${attachment.resource.name}-${index}`}
                            fileName={attachment.resource.name}
                            extension={fileExtension(attachment.resource.name)}
                            fileSize={attachment.resource.size}
                            uploadProgress={progress}
                            action={
                                <RemoveButton
                                    fileName={attachment.resource.name}
                                    disabled={isUploading}
                                    className="size-7 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2"
                                    onClick={() => removeAt(index)}
                                />
                            }
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
