import { useState } from 'react';
import { createPortal } from 'react-dom';

import Icon from 'dashboard/components-next/icon/Icon';
import FileCard from 'dashboard/components-next/message/chips/FileCard';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';
import { fileExtension, isMediaFile, localFileAttachment } from 'dashboard/conversation/localAttachment';

import { t } from '../../../i18n';

export interface PendingAttachment {
    currentChatId: number;
    resource: File;
    isPrivate: boolean;
    thumb: string;
    isVoiceMessage?: boolean;
}

interface AttachmentsPreviewProps {
    attachments: PendingAttachment[];
    className?: string;
    onRemoveAttachment: (attachments: PendingAttachment[]) => void;
}

// Trình duyệt cần URL còn sống tới khi tab mới đọc xong tệp.
const OPENED_FILE_URL_LIFETIME_MS = 60_000;

function openLocalFile(file: File) {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), OPENED_FILE_URL_LIFETIME_MS);
}

function TrayIconButton({
    icon,
    label,
    fileName,
    onClick,
    className,
}: {
    icon: string;
    label: string;
    fileName: string;
    onClick: () => void;
    className: string;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={`${label}: ${fileName}`}
            className={`grid p-0 place-content-center shrink-0 rounded-full transition-colors ${className}`}
            onClick={onClick}
        >
            <Icon icon={icon} className="size-3.5" />
        </button>
    );
}

// Khay đính kèm của ô soạn: ảnh/video hiện ảnh thu nhỏ, bấm là xem lớn bằng trình
// xem ảnh của khung chat; tài liệu hiện thẻ tệp, bấm mở là mở tệp. Nút bỏ đứng
// riêng khỏi vùng bấm xem. Ghi âm có khay riêng.
export default function AttachmentsPreview({ attachments, className = '', onRemoveAttachment }: AttachmentsPreviewProps) {
    const [openedMediaIndex, setOpenedMediaIndex] = useState<number | null>(null);
    const visibleItems = attachments
        .map((attachment, index) => ({ attachment, index }))
        .filter(({ attachment }) => !attachment.isVoiceMessage);
    const mediaItems = visibleItems.filter(({ attachment }) => isMediaFile(attachment.resource));
    const fileItems = visibleItems.filter(({ attachment }) => !isMediaFile(attachment.resource));
    const galleryItems = mediaItems.map(({ attachment, index }) =>
        localFileAttachment(attachment.resource, attachment.thumb, -(index + 1)),
    );
    const openedGalleryItem = openedMediaIndex === null ? null : (galleryItems[openedMediaIndex] ?? null);

    if (!visibleItems.length) return null;

    const removeAt = (removedIndex: number) => {
        setOpenedMediaIndex(null);
        onRemoveAttachment(attachments.filter((_, index) => index !== removedIndex));
    };

    return (
        <div data-testid="attachment-tray" className={`flex flex-col gap-2 overflow-auto max-h-[12.5rem] ${className}`}>
            <span className="text-xs font-medium text-n-slate-11">
                {t('COMPONENTS.MEDIA.ATTACHMENTS_COUNT', { count: visibleItems.length })}
            </span>
            {mediaItems.length ? (
                <div className="flex flex-wrap gap-2">
                    {mediaItems.map(({ attachment, index }, mediaIndex) => (
                        <div
                            key={`${attachment.resource.name}-${index}`}
                            data-testid="pending-media"
                            title={attachment.resource.name}
                            className="relative overflow-hidden rounded-lg size-20 shrink-0 bg-n-alpha-2"
                        >
                            <button
                                type="button"
                                aria-label={`${t(
                                    attachment.resource.type.startsWith('video/')
                                        ? 'COMPONENTS.MEDIA.OPEN_VIDEO'
                                        : 'COMPONENTS.MEDIA.OPEN_IMAGE',
                                )}: ${attachment.resource.name}`}
                                className="block p-0 size-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-n-brand"
                                onClick={() => setOpenedMediaIndex(mediaIndex)}
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
                            </button>
                            <TrayIconButton
                                icon="i-lucide-x"
                                label={t('COMPONENTS.MEDIA.REMOVE_ATTACHMENT')}
                                fileName={attachment.resource.name}
                                className="absolute size-5 top-1 ltr:right-1 rtl:left-1 bg-n-black/60 text-white hover:bg-n-black/80"
                                onClick={() => removeAt(index)}
                            />
                        </div>
                    ))}
                </div>
            ) : null}
            {fileItems.length ? (
                <div className="flex flex-col gap-1.5">
                    {fileItems.map(({ attachment, index }) => (
                        <FileCard
                            key={`${attachment.resource.name}-${index}`}
                            fileName={attachment.resource.name}
                            extension={fileExtension(attachment.resource.name)}
                            fileSize={attachment.resource.size}
                            action={
                                <>
                                    <TrayIconButton
                                        icon="i-lucide-external-link"
                                        label={t('COMPONENTS.MEDIA.OPEN_FILE')}
                                        fileName={attachment.resource.name}
                                        className="size-7 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2"
                                        onClick={() => openLocalFile(attachment.resource)}
                                    />
                                    <TrayIconButton
                                        icon="i-lucide-x"
                                        label={t('COMPONENTS.MEDIA.REMOVE_ATTACHMENT')}
                                        fileName={attachment.resource.name}
                                        className="size-7 text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2"
                                        onClick={() => removeAt(index)}
                                    />
                                </>
                            }
                        />
                    ))}
                </div>
            ) : null}
            {openedGalleryItem
                ? createPortal(
                      <GalleryView
                          attachment={openedGalleryItem}
                          allAttachments={galleryItems}
                          onClose={() => setOpenedMediaIndex(null)}
                      />,
                      document.body,
                  )
                : null}
        </div>
    );
}
