import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';
import { imageGridTemplateColumns, planImageGrid } from 'shared/helpers/imageGrid';
import { formatDuration } from 'shared/helpers/timeHelper';

import { t } from '../../../../i18n';
import { ATTACHMENT_TYPES } from '../constants';
import { resolveGalleryItems, singleMediaFrame } from '../helpers/attachments';
import type { MessageAttachment } from '../helpers/attachments';
import { useLoadWithRetry } from '../helpers/useLoadWithRetry';
import { useMessageContext } from '../provider';

const VIDEO_TYPES: string[] = [ATTACHMENT_TYPES.VIDEO, ATTACHMENT_TYPES.IG_REEL];

interface NaturalSize {
    width: number;
    height: number;
}

interface MediaTileProps {
    attachment: MessageAttachment;
    className?: string;
    style?: CSSProperties;
    hiddenCount?: number;
    onOpen: () => void;
    onNaturalSize?: (size: NaturalSize) => void;
}

function TileFailed() {
    return (
        <div className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-center size-full bg-n-alpha-2 text-n-slate-11">
            <Icon icon="i-lucide-image-off" className="size-5" />
            {t('COMPONENTS.MEDIA.LOADING_FAILED')}
        </div>
    );
}

function ImageTileContent({ attachment, onNaturalSize }: Pick<MediaTileProps, 'attachment' | 'onNaturalSize'>) {
    const { isLoaded, hasError, loadWithRetry } = useLoadWithRetry();

    useEffect(() => {
        if (attachment.data_url) void loadWithRetry(attachment.data_url);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachment.data_url]);

    if (hasError || !attachment.data_url) return <TileFailed />;
    if (!isLoaded) return <div data-media-placeholder className="size-full bg-n-alpha-2 animate-pulse" />;

    return (
        <img
            src={attachment.data_url}
            alt=""
            draggable={false}
            className="object-cover size-full skip-context-menu"
            onLoad={(event) =>
                onNaturalSize?.({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
        />
    );
}

// Ảnh bìa là khung đầu của video (poster nếu có), không tự phát; thời lượng đọc
// từ metadata.
function VideoTileContent({ attachment, onNaturalSize }: Pick<MediaTileProps, 'attachment' | 'onNaturalSize'>) {
    const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
    const [hasError, setHasError] = useState(false);

    if (hasError || !attachment.data_url) return <TileFailed />;

    return (
        <>
            <video
                src={`${attachment.data_url}#t=0.1`}
                poster={attachment.thumb_url || undefined}
                preload="metadata"
                muted
                playsInline
                className="object-cover size-full pointer-events-none bg-n-slate-12/80"
                onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    if (Number.isFinite(video.duration)) setDurationSeconds(Math.round(video.duration));
                    if (video.videoWidth && video.videoHeight) {
                        onNaturalSize?.({ width: video.videoWidth, height: video.videoHeight });
                    }
                }}
                onError={() => setHasError(true)}
            />
            <span className="absolute inset-0 grid pointer-events-none place-content-center">
                <span className="grid rounded-full shadow-md size-10 place-content-center bg-n-black/50 backdrop-blur-sm">
                    <Icon icon="i-lucide-play" className="text-white ms-0.5 size-5" />
                </span>
            </span>
            {durationSeconds !== null ? (
                <span
                    data-video-duration
                    className="absolute px-1.5 py-0.5 text-xs font-medium text-white rounded-md pointer-events-none bottom-1.5 ltr:right-1.5 rtl:left-1.5 tabular-nums bg-n-black/50"
                >
                    {formatDuration(durationSeconds)}
                </span>
            ) : null}
            {attachment.file_type === ATTACHMENT_TYPES.IG_REEL ? (
                <Icon icon="i-lucide-instagram" className="absolute text-white pointer-events-none top-2 ltr:right-2 rtl:left-2" />
            ) : null}
        </>
    );
}

function MediaTile({ attachment, className = '', style, hiddenCount, onOpen, onNaturalSize }: MediaTileProps) {
    const isVideo = VIDEO_TYPES.includes(attachment.file_type);

    return (
        <button
            type="button"
            data-media-tile={isVideo ? 'video' : 'image'}
            aria-label={isVideo ? t('COMPONENTS.MEDIA.OPEN_VIDEO') : t('COMPONENTS.MEDIA.OPEN_IMAGE')}
            className={`relative block p-0 m-0 overflow-hidden cursor-pointer bg-n-alpha-2 focus-visible:outline-2 focus-visible:outline-n-brand focus-visible:-outline-offset-2 ${className}`}
            style={style}
            onClick={(event) => {
                event.stopPropagation();
                onOpen();
            }}
        >
            {isVideo ? (
                <VideoTileContent attachment={attachment} onNaturalSize={onNaturalSize} />
            ) : (
                <ImageTileContent attachment={attachment} onNaturalSize={onNaturalSize} />
            )}
            {hiddenCount ? (
                <span
                    data-media-overflow
                    className="absolute inset-0 grid text-2xl font-semibold text-white place-content-center bg-n-black/50"
                >
                    +{hiddenCount}
                </span>
            ) : null}
        </button>
    );
}

// Ảnh đứng riêng lấy khung theo kích thước API trả; chưa có thì theo kích thước
// thật sau khi tải xong.
function SingleMedia({ attachment, onOpen }: { attachment: MessageAttachment; onOpen: () => void }) {
    const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);
    const hasKnownSize = Boolean(attachment.width && attachment.height);
    const frame = hasKnownSize
        ? singleMediaFrame(attachment.width, attachment.height)
        : singleMediaFrame(naturalSize?.width, naturalSize?.height);

    return (
        <MediaTile
            attachment={attachment}
            style={{ width: `${frame.width}px`, maxWidth: '100%', aspectRatio: frame.aspectRatio }}
            onOpen={onOpen}
            onNaturalSize={hasKnownSize ? undefined : setNaturalSize}
        />
    );
}

interface MediaGridProps {
    media: MessageAttachment[];
    className?: string;
}

// Ảnh và video của một tin xếp thành lưới theo luật dùng chung; bấm một ô mở
// trình xem ngay tại mục đó.
export default function MediaGrid({ media, className = '' }: MediaGridProps) {
    const { filteredCurrentChatAttachments } = useMessageContext();
    const [openedAttachment, setOpenedAttachment] = useState<MessageAttachment | null>(null);

    if (!media.length) return null;

    const plan = planImageGrid(media);
    const galleryItems = openedAttachment
        ? resolveGalleryItems(media, filteredCurrentChatAttachments, openedAttachment)
        : [];

    return (
        <>
            <div data-media-grid={plan.layout} className={className}>
                {plan.layout === 'single' ? (
                    <SingleMedia attachment={media[0]} onOpen={() => setOpenedAttachment(media[0])} />
                ) : (
                    <div
                        className="grid gap-0.5 w-72 max-w-full"
                        style={{ gridTemplateColumns: imageGridTemplateColumns(plan.columns) }}
                    >
                        {plan.tiles.map((tile) =>
                            tile.kind === 'image' ? (
                                <MediaTile
                                    key={tile.image.id}
                                    attachment={tile.image}
                                    className="aspect-square"
                                    onOpen={() => setOpenedAttachment(tile.image)}
                                />
                            ) : (
                                <MediaTile
                                    key={`overflow-${media[tile.firstHiddenIndex].id}`}
                                    attachment={media[tile.firstHiddenIndex]}
                                    className="aspect-square"
                                    hiddenCount={tile.hiddenCount}
                                    onOpen={() => setOpenedAttachment(media[tile.firstHiddenIndex])}
                                />
                            ),
                        )}
                    </div>
                )}
            </div>
            {openedAttachment ? (
                <GalleryView
                    attachment={openedAttachment}
                    allAttachments={galleryItems}
                    onClose={() => setOpenedAttachment(null)}
                />
            ) : null}
        </>
    );
}
