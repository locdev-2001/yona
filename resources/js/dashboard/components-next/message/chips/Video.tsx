import { useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';

import { useMessageContext } from '../provider';
import type { MessageAttachment } from '../helpers/attachments';

// Port từ dashboard/components-next/message/chips/Video.vue.
export default function VideoChip({ attachment }: { attachment: MessageAttachment }) {
    const { filteredCurrentChatAttachments } = useMessageContext();
    const [showGallery, setShowGallery] = useState(false);

    return (
        <>
            <div
                className="size-[72px] overflow-hidden contain-content rounded-xl cursor-pointer relative group"
                onClick={() => setShowGallery(true)}
            >
                <video src={attachment.data_url ?? ''} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute w-full h-full inset-0 p-1 flex items-center justify-center">
                    <div className="size-7 bg-n-slate-1/60 backdrop-blur-sm rounded-full overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.4)]">
                        <Icon
                            icon="i-teenyicons-play-small-solid"
                            className="size-7 text-n-slate-12/80 backdrop-blur"
                        />
                    </div>
                </div>
            </div>
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
