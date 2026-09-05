import { useState } from 'react';

import Files from 'dashboard/components-next/SharedAttachments/Files';
import Media from 'dashboard/components-next/SharedAttachments/Media';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';

import { t } from '../../../../i18n';
import { useConversation } from '../../ConversationContext';
import { hasSharedContent, mediaAttachments } from './sharedAttachments';

// Port từ routes/dashboard/conversation/SharedFiles.vue — đọc thẳng danh sách
// đính kèm của hội thoại đang mở (ConversationContext giữ, đúng getter
// getSelectedChatAttachments của store gốc).
const MEDIA_PEEK_LIMIT = 6;
const FILES_PEEK_LIMIT = 3;

export default function SharedFiles() {
    const { attachments, attachmentsLoaded } = useConversation();
    const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null);

    const onFileSelect = (attachment: MessageAttachment) => {
        if (attachment.data_url) window.open(attachment.data_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="p-2">
            {!attachmentsLoaded ? (
                <div className="flex justify-center p-3">
                    <Spinner className="size-5" />
                </div>
            ) : !hasSharedContent(attachments) ? (
                <p className="p-3 text-sm text-center text-n-slate-11">
                    {t('CONVERSATION_SIDEBAR.SHARED_FILES.EMPTY')}
                </p>
            ) : (
                <div className="flex flex-col gap-5">
                    <Media
                        attachments={attachments}
                        peekLimit={MEDIA_PEEK_LIMIT}
                        onSelect={setSelectedAttachment}
                    />
                    <Files attachments={attachments} peekLimit={FILES_PEEK_LIMIT} onSelect={onFileSelect} />
                </div>
            )}
            {selectedAttachment ? (
                <GalleryView
                    attachment={selectedAttachment}
                    allAttachments={mediaAttachments(attachments)}
                    autoPlay
                    onClose={() => setSelectedAttachment(null)}
                />
            ) : null}
        </div>
    );
}
