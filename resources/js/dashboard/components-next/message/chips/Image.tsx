import { useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';

import { t } from '../../../../i18n';
import { useMessageContext } from '../provider';
import type { MessageAttachment } from '../helpers/attachments';

// Port từ dashboard/components-next/message/chips/Image.vue.
export default function ImageChip({ attachment }: { attachment: MessageAttachment }) {
    const { filteredCurrentChatAttachments } = useMessageContext();
    const [hasError, setHasError] = useState(false);
    const [showGallery, setShowGallery] = useState(false);

    return (
        <>
            <div
                className="size-[72px] overflow-hidden contain-content rounded-xl cursor-pointer"
                onClick={() => setShowGallery(true)}
            >
                {hasError ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-xs text-center rounded-lg size-full bg-n-alpha-1 text-n-slate-11">
                        <Icon icon="i-lucide-circle-off" className="text-n-slate-11" />
                        {t('COMPONENTS.MEDIA.LOADING_FAILED')}
                    </div>
                ) : (
                    <img
                        className="object-cover w-full h-full skip-context-menu"
                        src={attachment.data_url ?? ''}
                        onError={() => setHasError(true)}
                    />
                )}
            </div>
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
