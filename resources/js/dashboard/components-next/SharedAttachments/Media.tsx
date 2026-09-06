import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { downloadFile } from '@chatwoot/utils';

import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';
import { ATTACHMENT_TYPES } from 'dashboard/components-next/message/constants';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    fileNameFromUrl,
    mediaAttachments as sortMediaAttachments,
    mediaOverflowCount,
} from 'dashboard/conversation/conversationbox/contact/sharedAttachments';
import { formatDuration, shortTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../../i18n';

// Port từ dashboard/components-next/SharedAttachments/Media.vue.
interface MediaProps {
    attachments: MessageAttachment[];
    peekLimit?: number;
    showJumpToMessage?: boolean;
    onSelect: (attachment: MessageAttachment) => void;
    onJumpToMessage?: (attachment: MessageAttachment) => void;
}

const isVideoType = (fileType: string): boolean =>
    [ATTACHMENT_TYPES.VIDEO, ATTACHMENT_TYPES.IG_REEL].includes(fileType as never);
const isAudioType = (fileType: string): boolean => fileType === ATTACHMENT_TYPES.AUDIO;
const isPlayableType = (fileType: string): boolean => isVideoType(fileType) || isAudioType(fileType);

const fallbackIcon = (fileType: string): string => {
    if (isAudioType(fileType)) return 'i-lucide-music';
    if (isVideoType(fileType)) return 'i-lucide-video';

    return 'i-lucide-image';
};

export default function Media({
    attachments,
    peekLimit = 0,
    showJumpToMessage = false,
    onSelect,
    onJumpToMessage,
}: MediaProps) {
    const [showAll, setShowAll] = useState(false);
    const [failedThumbs, setFailedThumbs] = useState<number[]>([]);
    const [failedPreviews, setFailedPreviews] = useState<number[]>([]);
    const [durations, setDurations] = useState<Record<number, number>>({});
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const mediaList = sortMediaAttachments(attachments);
    if (!mediaList.length) return null;

    const isPeekable = peekLimit > 0;
    const visibleMedia = !isPeekable || showAll ? mediaList : mediaList.slice(0, peekLimit);
    const overflow = isPeekable ? mediaOverflowCount(mediaList.length, peekLimit) : 0;

    const imagePreviewSrc = (attachment: MessageAttachment): string | null => {
        const canUseThumb = Boolean(attachment.thumb_url) && !failedThumbs.includes(attachment.id);
        if (attachment.file_type === ATTACHMENT_TYPES.IMAGE) {
            return (canUseThumb ? attachment.thumb_url : attachment.data_url) ?? null;
        }
        if (isVideoType(attachment.file_type)) return canUseThumb ? (attachment.thumb_url ?? null) : null;

        return null;
    };

    const onPreviewError = (attachment: MessageAttachment) => {
        const canRetryWithFull =
            Boolean(attachment.thumb_url) && !failedThumbs.includes(attachment.id) && Boolean(attachment.data_url);
        if (
            canRetryWithFull &&
            (attachment.file_type === ATTACHMENT_TYPES.IMAGE || isVideoType(attachment.file_type))
        ) {
            setFailedThumbs(current => [...current, attachment.id]);
            return;
        }
        setFailedPreviews(current => [...current, attachment.id]);
    };

    const hasPreview = (attachment: MessageAttachment): boolean =>
        Boolean(imagePreviewSrc(attachment)) && !failedPreviews.includes(attachment.id);
    const hasVideoPreview = (attachment: MessageAttachment): boolean =>
        isVideoType(attachment.file_type) &&
        Boolean(attachment.data_url) &&
        !failedPreviews.includes(attachment.id);

    const onLoadedMetadata = (attachment: MessageAttachment, event: SyntheticEvent<HTMLMediaElement>) => {
        const seconds = event.currentTarget.duration;
        if (Number.isFinite(seconds) && seconds > 0) {
            setDurations(current => ({ ...current, [attachment.id]: seconds }));
        }
    };

    const displayDuration = (attachment: MessageAttachment): string => {
        const seconds = durations[attachment.id];

        return seconds ? formatDuration(Math.round(seconds)) : '';
    };

    const displayTime = (attachment: MessageAttachment): string =>
        attachment.created_at ? shortTimestamp(attachment.created_at, true) : '';

    const isOverflowTile = (index: number): boolean =>
        isPeekable && !showAll && overflow > 0 && index === peekLimit - 1;

    const onTileActivate = (attachment: MessageAttachment, index: number) => {
        if (isOverflowTile(index)) {
            setShowAll(true);
            return;
        }
        onSelect(attachment);
    };

    const onDownloadFile = async (attachment: MessageAttachment) => {
        try {
            setDownloadingId(attachment.id);
            await downloadFile({
                url: attachment.data_url ?? '',
                type: attachment.file_type,
                extension: attachment.extension ?? null,
            });
        } catch {
            useAlert(t('CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD_ERROR'));
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <section className="flex flex-col gap-2.5">
            <header className="flex items-center justify-between px-0.5">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-n-slate-11">
                    {t('CONVERSATION_SIDEBAR.SHARED_FILES.MEDIA_HEADING')}
                    <span className="ms-1 font-medium tracking-normal normal-case text-n-slate-10">
                        {mediaList.length}
                    </span>
                </h4>
                {overflow > 0 ? (
                    <NextButton
                        ghost
                        slate
                        xs
                        trailingIcon
                        icon={showAll ? 'i-lucide-chevron-up' : 'i-lucide-chevron-right'}
                        label={
                            showAll
                                ? t('CONVERSATION_SIDEBAR.SHARED_FILES.SHOW_LESS')
                                : t('CONVERSATION_SIDEBAR.SHARED_FILES.VIEW_ALL')
                        }
                        onClick={() => setShowAll(!showAll)}
                    />
                ) : null}
            </header>
            <div className="grid grid-cols-3 gap-2">
                {visibleMedia.map((attachment, index) => (
                    <div
                        key={attachment.id}
                        role="button"
                        tabIndex={0}
                        className="relative w-full overflow-hidden transition-all duration-200 rounded-lg cursor-pointer aspect-square bg-n-slate-3 shadow-sm hover:shadow-md hover:-translate-y-px group focus:outline-none focus-visible:ring-2 focus-visible:ring-n-blue-9"
                        onClick={() => onTileActivate(attachment, index)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') onTileActivate(attachment, index);
                            if (event.key === ' ') {
                                event.preventDefault();
                                onTileActivate(attachment, index);
                            }
                        }}
                    >
                        {isOverflowTile(index) ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-n-slate-5">
                                <span className="text-base font-semibold text-n-slate-12">
                                    {t('CONVERSATION_SIDEBAR.SHARED_FILES.MORE_COUNT', { count: overflow })}
                                </span>
                            </div>
                        ) : (
                            <>
                                {hasPreview(attachment) ? (
                                    <img
                                        src={imagePreviewSrc(attachment) ?? undefined}
                                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                        alt={fileNameFromUrl(attachment.data_url)}
                                        onError={() => onPreviewError(attachment)}
                                    />
                                ) : hasVideoPreview(attachment) ? (
                                    <video
                                        src={`${attachment.data_url}#t=0.1`}
                                        preload="metadata"
                                        muted
                                        playsInline
                                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                                        onLoadedMetadata={event => onLoadedMetadata(attachment, event)}
                                        onError={() => onPreviewError(attachment)}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-n-slate-3 to-n-slate-4">
                                        <Icon
                                            icon={fallbackIcon(attachment.file_type)}
                                            className="size-6 text-n-slate-11"
                                        />
                                    </div>
                                )}

                                {isAudioType(attachment.file_type) && attachment.data_url ? (
                                    <audio
                                        src={attachment.data_url}
                                        preload="metadata"
                                        className="hidden"
                                        onLoadedMetadata={event => onLoadedMetadata(attachment, event)}
                                    />
                                ) : null}

                                <div className="absolute inset-0 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                                {hasVideoPreview(attachment) ? (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent">
                                        <div className="flex items-center justify-center rounded-full size-7 bg-white/95 shadow-md">
                                            <Icon icon="i-lucide-play" className="ms-0.5 size-3.5 text-n-black" />
                                        </div>
                                    </div>
                                ) : null}

                                {isPlayableType(attachment.file_type) && displayDuration(attachment) ? (
                                    <span className="absolute text-xxs font-medium tabular-nums transition-opacity bottom-1.5 ltr:right-1.5 rtl:left-1.5 text-white [text-shadow:_0_1px_3px_rgba(0,0,0,0.95),_0_0_10px_rgba(0,0,0,0.7)] group-hover:opacity-0">
                                        {displayDuration(attachment)}
                                    </span>
                                ) : null}

                                {displayTime(attachment) ? (
                                    <span className="absolute text-xxs font-medium transition-opacity opacity-0 bottom-1.5 ltr:left-1.5 rtl:right-1.5 text-white [text-shadow:_0_1px_3px_rgba(0,0,0,0.95),_0_0_10px_rgba(0,0,0,0.7)] group-hover:opacity-100">
                                        {displayTime(attachment)}
                                    </span>
                                ) : null}

                                <button
                                    type="button"
                                    className="absolute flex items-center justify-center !p-px transition-all rounded-full opacity-0 bottom-1.5 ltr:right-1.5 rtl:left-1.5 size-6 bg-white/95 shadow-md group-hover:opacity-100 hover:bg-white disabled:opacity-50"
                                    disabled={downloadingId === attachment.id}
                                    aria-label={t('CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD')}
                                    onClick={event => {
                                        event.stopPropagation();
                                        void onDownloadFile(attachment);
                                    }}
                                    onKeyDown={event => event.stopPropagation()}
                                >
                                    <Icon icon="i-lucide-download" className="size-3 text-n-black" />
                                </button>

                                {showJumpToMessage && attachment.message_id ? (
                                    <button
                                        type="button"
                                        title={t('CONVERSATION_SIDEBAR.SHARED_FILES.JUMP_TO_MESSAGE')}
                                        className="absolute flex items-center justify-center !p-px transition-all rounded-full opacity-0 top-1.5 ltr:right-1.5 rtl:left-1.5 size-6 bg-white/95 shadow-md group-hover:opacity-100 hover:bg-white"
                                        aria-label={t('CONVERSATION_SIDEBAR.SHARED_FILES.JUMP_TO_MESSAGE')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            onJumpToMessage?.(attachment);
                                        }}
                                        onKeyDown={event => event.stopPropagation()}
                                    >
                                        <Icon icon="i-lucide-external-link" className="size-3 text-n-black" />
                                    </button>
                                ) : null}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
