import { useEffect, useState } from 'react';
import { downloadFile } from '@chatwoot/utils';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';
import { useAlert } from 'dashboard/composables/useAlert';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import { useLoadWithRetry } from '../helpers/useLoadWithRetry';

// Port từ dashboard/components-next/message/bubbles/Image.vue.
export default function ImageBubble() {
    const { attachments, filteredCurrentChatAttachments } = useMessageContext();
    const attachment = attachments[0];

    const { isLoaded, hasError, setHasError, loadWithRetry } = useLoadWithRetry();
    const [showGallery, setShowGallery] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (attachment?.data_url) {
            void loadWithRetry(attachment.data_url);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachment?.data_url]);

    const downloadAttachment = async () => {
        try {
            setIsDownloading(true);
            await downloadFile({
                url: attachment.data_url ?? '',
                type: attachment.file_type,
                extension: attachment.extension ?? null,
            });
        } catch {
            useAlert(t('GALLERY_VIEW.ERROR_DOWNLOADING'));
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            <BaseBubble className="overflow-hidden p-3" dataBubbleName="image" onClick={() => setShowGallery(true)}>
                {hasError ? (
                    <div className="flex items-center gap-1 text-center rounded-lg">
                        <Icon icon="i-lucide-circle-off" className="text-n-slate-11" />
                        <p className="mb-0 text-n-slate-11">{t('COMPONENTS.MEDIA.IMAGE_UNAVAILABLE')}</p>
                    </div>
                ) : isLoaded ? (
                    <div className="relative group rounded-lg overflow-hidden">
                        <img
                            className="skip-context-menu"
                            src={attachment.data_url ?? ''}
                            width={attachment.width ?? undefined}
                            height={attachment.height ?? undefined}
                        />
                        <div className="inset-0 p-2 pointer-events-none absolute bg-gradient-to-tl from-n-slate-12/30 dark:from-n-slate-1/50 via-transparent to-transparent hidden group-hover:flex" />
                        <div className="absolute right-2 bottom-2 hidden group-hover:flex gap-2">
                            <Button xs solid slate icon="i-lucide-expand" className="opacity-60" />
                            <Button
                                xs
                                solid
                                slate
                                icon="i-lucide-download"
                                className="opacity-60"
                                isLoading={isDownloading}
                                disabled={isDownloading}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void downloadAttachment();
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </BaseBubble>
            {showGallery ? (
                <GalleryView
                    attachment={attachment}
                    allAttachments={filteredCurrentChatAttachments}
                    onError={() => setHasError(true)}
                    onClose={() => setShowGallery(false)}
                />
            ) : null}
        </>
    );
}
