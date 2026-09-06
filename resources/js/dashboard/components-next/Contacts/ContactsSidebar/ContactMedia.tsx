import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Files from 'dashboard/components-next/SharedAttachments/Files';
import Media from 'dashboard/components-next/SharedAttachments/Media';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { hasSharedContent, mediaAttachments } from 'dashboard/conversation/conversationbox/contact/sharedAttachments';
import { fetchContactAttachments } from 'dashboard/contacts/api';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../../types';

// Port từ components-next/Contacts/ContactsSidebar/ContactMedia.vue.
const MEDIA_PEEK_LIMIT = 12;
const FILES_PEEK_LIMIT = 6;

interface ContactMediaProps {
    contactId: number;
}

export default function ContactMedia({ contactId }: ContactMediaProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null);

    useEffect(() => {
        let cancelled = false;
        setFetching(true);
        fetchContactAttachments(accountId, contactId)
            .catch(() => [])
            .then(payload => {
                if (cancelled) return;
                setAttachments(payload as unknown as MessageAttachment[]);
                setFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    const onFileSelect = (attachment: MessageAttachment) => {
        if (attachment.data_url) window.open(attachment.data_url, '_blank', 'noopener,noreferrer');
    };

    const onJumpToMessage = (attachment: MessageAttachment) => {
        const conversationId = (attachment as { conversation_id?: number }).conversation_id;
        if (!conversationId || !attachment.message_id) return;

        window.location.assign(
            `${conversationUrl({ accountId, id: conversationId })}?messageId=${attachment.message_id}`,
        );
    };

    return (
        <div className="px-6">
            {isFetching ? (
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
                        showJumpToMessage
                        onSelect={setSelectedAttachment}
                        onJumpToMessage={onJumpToMessage}
                    />
                    <Files
                        attachments={attachments}
                        peekLimit={FILES_PEEK_LIMIT}
                        showJumpToMessage
                        onSelect={onFileSelect}
                        onJumpToMessage={onJumpToMessage}
                    />
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
