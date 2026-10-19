import { useCallback, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { downloadFile } from '@ext/utils';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { senderAvatarSeed } from 'shared/avatar/avatarSeed';
import NextButton from 'dashboard/components-next/button/Button';
import CloseButton from 'dashboard/components-next/close-button/CloseButton';
import Modal from 'dashboard/components/Modal';
import { useAlert } from 'dashboard/composables/useAlert';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useSwipeToDismiss } from 'dashboard/composables/useSwipeToDismiss';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { messageTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../../../../i18n';
import type { DashboardPageProps } from '../../../../types';
import { useImageZoom } from './useImageZoom';

// Port từ dashboard/components/widgets/conversation/components/GalleryView.vue.
// TeleportWithDirection bỏ (Modal của ta đã tự phủ toàn màn hình).
const ALLOWED_FILE_TYPES = {
    IMAGE: 'image',
    VIDEO: 'video',
    IG_REEL: 'ig_reel',
    AUDIO: 'audio',
} as const;

const ALLOWED_FILE_TYPE_LIST: string[] = Object.values(ALLOWED_FILE_TYPES);

// Mở đúng mục được bấm (tin nhiều ảnh có nhiều mục cùng message_id).
function initialGalleryIndex(attachment: MessageAttachment, allAttachments: MessageAttachment[]): number {
    const byAttachment = allAttachments.findIndex((item) => item.id === attachment.id);
    if (byAttachment >= 0) return byAttachment;
    const byMessage = allAttachments.findIndex((item) => item.message_id === attachment.message_id);
    return byMessage > 0 ? byMessage : 0;
}

interface GalleryViewProps {
    attachment: MessageAttachment;
    allAttachments: MessageAttachment[];
    autoPlay?: boolean;
    onClose: () => void;
    onError?: () => void;
    // Có thì thêm nút "Tới tin nhắn" cho mục đang xem; viewer tự đóng trước khi gọi.
    onJumpToMessage?: (attachment: MessageAttachment) => void;
}

export default function GalleryView({
    attachment,
    allAttachments,
    autoPlay = false,
    onClose,
    onError,
    onJumpToMessage,
}: GalleryViewProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const currentUserId = auth.user?.id;

    const imageRef = useRef<HTMLImageElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(() => initialGalleryIndex(attachment, allAttachments));
    const [activeAttachment, setActiveAttachment] = useState<MessageAttachment>(attachment);

    const {
        activeImageRotation,
        imageWrapperStyle,
        imageStyle,
        onRotate,
        onZoom,
        onDoubleClickZoomImage,
        onWheelImageZoom,
        onMouseMove,
        onMouseLeave,
        resetZoomAndRotation,
    } = useImageZoom(imageRef);

    const activeFileType = activeAttachment.file_type;
    const isImage = activeFileType === ALLOWED_FILE_TYPES.IMAGE;
    const isVideo = activeFileType === ALLOWED_FILE_TYPES.VIDEO || activeFileType === ALLOWED_FILE_TYPES.IG_REEL;
    const isAudio = activeFileType === ALLOWED_FILE_TYPES.AUDIO;
    const hasMoreThanOneAttachment = allAttachments.length > 1;

    const readableTime = activeAttachment.created_at
        ? messageTimestamp(activeAttachment.created_at, 'LLL d yyyy, h:mm a')
        : '';

    const senderDetails = useMemo(() => {
        const sender = (activeAttachment.sender ?? attachment.sender ?? {}) as Record<string, unknown>;
        const name = (sender.name as string) || (sender.available_name as string) || '';

        return {
            name: currentUserId === sender.id ? 'You' : name,
            avatar: (sender.thumbnail as string) || (sender.avatar_url as string) || '',
            seed: senderAvatarSeed(sender as { id?: number; type?: string }),
        };
    }, [activeAttachment, attachment, currentUserId]);

    // Tệp không mang tên riêng thì lấy tên từ đường dẫn; tên rỗng là cố ý ẩn (vd. ảnh đại diện).
    const displayFileName = useMemo(() => {
        if (activeAttachment.filename != null) return activeAttachment.filename;
        const dataUrl = activeAttachment.data_url;
        if (!dataUrl) return '';
        const fileName = dataUrl.split('/').pop();
        return fileName ? decodeURIComponent(fileName) : '';
    }, [activeAttachment]);

    const changeAttachment = useCallback(
        (next: MessageAttachment | undefined, index: number) => {
            if (!next || !ALLOWED_FILE_TYPE_LIST.includes(next.file_type)) return;
            setActiveIndex(index);
            setActiveAttachment(next);
            resetZoomAndRotation();
        },
        [resetZoomAndRotation],
    );

    const onClickDownload = async () => {
        const { file_type: type, data_url: url, extension } = activeAttachment;
        if (!ALLOWED_FILE_TYPE_LIST.includes(type)) return;

        try {
            setIsDownloading(true);
            await downloadFile({ url: url ?? '', type, extension: extension ?? null });
        } catch {
            useAlert(t('GALLERY_VIEW.ERROR_DOWNLOADING'));
        } finally {
            setIsDownloading(false);
        }
    };

    const showPrevious = () => changeAttachment(allAttachments[activeIndex - 1], activeIndex - 1);
    const showNext = () => changeAttachment(allAttachments[activeIndex + 1], activeIndex + 1);

    useKeyboardEvents({
        Escape: { action: onClose, allowOnFocusedInput: true },
        ArrowLeft: { action: showPrevious },
        ArrowRight: { action: showNext },
    });
    const swipeToDismiss = useSwipeToDismiss(onClose, (direction) =>
        direction === 'next' ? showNext() : showPrevious(),
    );

    return (
        <Modal show fullWidth showCloseButton={false} onClose={onClose}>
            <div
                className="bg-n-background flex flex-col h-[inherit] w-[inherit] overflow-hidden select-none"
                onClick={onClose}
            >
                <header
                    className="z-10 flex items-center justify-between w-full h-16 px-3 sm:px-6 py-2 bg-n-surface-panel"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-center min-w-0 flex-1 sm:flex-none sm:min-w-[15rem] sm:shrink-0">
                        {senderDetails.avatar ? (
                            <Avatar
                                seed={senderDetails.seed}
                                name={senderDetails.name}
                                src={senderDetails.avatar}
                                size={40}
                                roundedFull
                                className="flex-shrink-0"
                            />
                        ) : null}
                        <div className="flex flex-col ms-2 overflow-hidden">
                            <h3 className="text-base leading-5 m-0 font-medium">
                                <span className="block overflow-hidden text-n-slate-12 whitespace-nowrap text-ellipsis">
                                    {senderDetails.name}
                                </span>
                            </h3>
                            <span className="text-xs text-n-slate-11 whitespace-nowrap text-ellipsis">
                                {readableTime}
                            </span>
                        </div>
                    </div>

                    <div className="hidden sm:block flex-1 mx-2 px-2 truncate text-sm font-medium text-center text-n-slate-12">
                        <span className="truncate">{displayFileName}</span>
                    </div>

                    <div className="flex items-center gap-2 ms-2 shrink-0">
                        {isImage ? (
                            <>
                                <NextButton
                                    icon="i-lucide-zoom-in"
                                    aria-label={t('GALLERY_VIEW.ZOOM_IN')}
                                    slate
                                    ghost
                                    onClick={() => onZoom(0.1)}
                                />
                                <NextButton
                                    icon="i-lucide-zoom-out"
                                    aria-label={t('GALLERY_VIEW.ZOOM_OUT')}
                                    slate
                                    ghost
                                    onClick={() => onZoom(-0.1)}
                                />
                                <div className="hidden sm:flex items-center gap-2">
                                    <NextButton
                                        icon="i-lucide-rotate-ccw"
                                        aria-label={t('GALLERY_VIEW.ROTATE_LEFT')}
                                        slate
                                        ghost
                                        onClick={() => onRotate('counter-clockwise')}
                                    />
                                    <NextButton
                                        icon="i-lucide-rotate-cw"
                                        aria-label={t('GALLERY_VIEW.ROTATE_RIGHT')}
                                        slate
                                        ghost
                                        onClick={() => onRotate('clockwise')}
                                    />
                                </div>
                            </>
                        ) : null}
                        {onJumpToMessage && activeAttachment.message_id ? (
                            <NextButton
                                icon="i-lucide-message-square-text"
                                label={t('CONVERSATION_SIDEBAR.SHARED_FILES.JUMP_TO_MESSAGE')}
                                slate
                                faded
                                sm
                                onClick={() => {
                                    onClose();
                                    onJumpToMessage(activeAttachment);
                                }}
                            />
                        ) : null}
                        <NextButton
                            icon="i-lucide-download"
                            aria-label={t('GALLERY_VIEW.DOWNLOAD')}
                            slate
                            ghost
                            isLoading={isDownloading}
                            disabled={isDownloading}
                            onClick={onClickDownload}
                        />
                        <CloseButton label={t('GALLERY_VIEW.CLOSE')} onClick={onClose} />
                    </div>
                </header>

                <main
                    className="relative flex items-stretch flex-1 h-full overflow-hidden"
                    style={swipeToDismiss.style}
                    {...swipeToDismiss.handlers}
                >
                    {hasMoreThanOneAttachment ? (
                        <div className="absolute inset-y-0 z-10 flex items-center justify-center w-12 ltr:left-0 rtl:right-0 sm:static sm:w-16 shrink-0">
                            <NextButton
                                icon="ltr:i-lucide-chevron-left rtl:i-lucide-chevron-right"
                                aria-label={t('GALLERY_VIEW.PREVIOUS')}
                                className="z-10"
                                blue
                                faded
                                lg
                                disabled={activeIndex === 0}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    showPrevious();
                                }}
                            />
                        </div>
                    ) : null}

                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                            <div
                                style={imageWrapperStyle}
                                className={`flex items-center justify-center origin-center ${
                                    activeImageRotation % 180 !== 0
                                        ? 'w-[calc(100dvh-8rem)] h-[calc(100dvw-7rem)]'
                                        : 'size-full'
                                }`}
                            >
                                <img
                                    ref={imageRef}
                                    key={activeAttachment.id}
                                    src={activeAttachment.data_url ?? ''}
                                    style={imageStyle}
                                    className="max-h-full max-w-full object-contain duration-100 ease-in-out transform select-none"
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => {
                                        event.stopPropagation();
                                        onDoubleClickZoomImage(event);
                                    }}
                                    onWheel={onWheelImageZoom}
                                    onMouseMove={(event) =>
                                        onMouseMove({ clientX: event.clientX, clientY: event.clientY })
                                    }
                                    onMouseLeave={() => onMouseLeave()}
                                    onError={onError}
                                />
                            </div>
                        ) : null}

                        {isVideo ? (
                            <video
                                key={activeAttachment.id}
                                src={activeAttachment.data_url ?? ''}
                                controls
                                playsInline
                                autoPlay={autoPlay}
                                className="max-h-full max-w-full object-contain"
                                onClick={(event) => event.stopPropagation()}
                            />
                        ) : null}

                        {isAudio ? (
                            <audio
                                key={activeAttachment.id}
                                controls
                                autoPlay={autoPlay}
                                className="w-full max-w-md"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <source src={`${activeAttachment.data_url}?t=${Date.now()}`} />
                            </audio>
                        ) : null}
                    </div>

                    {hasMoreThanOneAttachment ? (
                        <div className="absolute inset-y-0 z-10 flex items-center justify-center w-12 ltr:right-0 rtl:left-0 sm:static sm:w-16 shrink-0">
                            <NextButton
                                icon="ltr:i-lucide-chevron-right rtl:i-lucide-chevron-left"
                                aria-label={t('GALLERY_VIEW.NEXT')}
                                className="z-10"
                                blue
                                faded
                                lg
                                disabled={activeIndex === allAttachments.length - 1}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    showNext();
                                }}
                            />
                        </div>
                    ) : null}
                </main>

                {hasMoreThanOneAttachment ? (
                    <footer className="z-10 flex items-center justify-center h-12 bg-n-surface-panel">
                        <div
                            data-testid="gallery-position"
                            className="rounded-md flex items-center justify-center px-3 py-1 bg-n-slate-3 text-n-slate-12 text-sm font-medium tabular-nums"
                        >
                            {`${activeIndex + 1} / ${allAttachments.length}`}
                        </div>
                    </footer>
                ) : null}
            </div>
        </Modal>
    );
}
