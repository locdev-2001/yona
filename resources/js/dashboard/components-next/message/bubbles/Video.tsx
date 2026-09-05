import { useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';

import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import { ATTACHMENT_TYPES } from '../constants';

// Port từ dashboard/components-next/message/bubbles/Video.vue. Bỏ state
// hasError của bản gốc: nó chỉ emit ra ngoài, template không đọc.
export default function VideoBubble() {
    const { attachments, filteredCurrentChatAttachments } = useMessageContext();
    const attachment = attachments[0];
    const isReel = attachment.file_type === ATTACHMENT_TYPES.IG_REEL;

    const [showGallery, setShowGallery] = useState(false);

    return (
        <>
            <BaseBubble className="overflow-hidden p-3" dataBubbleName="video" onClick={() => setShowGallery(true)}>
                <div className="relative group rounded-lg overflow-hidden">
                    {isReel ? (
                        <div className="absolute p-2 flex items-start justify-end right-0 pointer-events-none">
                            <Icon icon="i-lucide-instagram" className="text-white shadow-lg" />
                        </div>
                    ) : null}
                    <video
                        controls
                        className={`rounded-lg skip-context-menu ${isReel ? 'max-w-48' : 'max-w-full'}`}
                        src={attachment.data_url ?? ''}
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            </BaseBubble>
            {showGallery ? (
                <GalleryView
                    attachment={attachment}
                    allAttachments={filteredCurrentChatAttachments}
                    onClose={() => setShowGallery(false)}
                />
            ) : null}
        </>
    );
}
