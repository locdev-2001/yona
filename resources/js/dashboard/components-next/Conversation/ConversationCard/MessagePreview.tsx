import { t } from '../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import { messagePreviewBody } from 'dashboard/components-next/message/helpers/messagePreview';
import { MESSAGE_TYPES } from 'dashboard/conversation/constants';
import type { ConversationMessage } from 'dashboard/conversation/types';

// Port từ components-next/Conversation/ConversationCard/MessagePreview.vue.
const ATTACHMENT_ICONS: Record<string, string> = {
    image: 'i-lucide-image',
    audio: 'i-lucide-headphones',
    video: 'i-lucide-video',
    file: 'i-lucide-file',
    location: 'i-lucide-map-pin',
    fallback: 'i-lucide-link-2',
};

interface MessagePreviewProps {
    message: Partial<ConversationMessage>;
    showMessageType?: boolean;
    defaultEmptyMessage?: string;
    multiLine?: boolean;
    className?: string;
}

export default function MessagePreview({
    message,
    showMessageType = true,
    defaultEmptyMessage = '',
    multiLine = false,
    className = '',
}: MessagePreviewProps) {
    const messageByAgent = message.message_type === MESSAGE_TYPES.OUTGOING;
    const isMessageAnActivity = message.message_type === MESSAGE_TYPES.ACTIVITY;
    const isMessagePrivate = Boolean(message.private);
    // Năng lực `friend_request`: thẻ hội thoại nói rõ đây là lời mời, không phải
    // tin thường — lời nhắn kèm theo (nếu có) đã nằm trong bong bóng.
    const isFriendRequest = Boolean((message.content_attributes as { friend_request?: unknown } | undefined)?.friend_request);
    const body = messagePreviewBody(message);

    const typeIcon = (extraClass: string) => {
        if (isMessagePrivate) return <Icon icon="i-lucide-lock-keyhole" className={extraClass} />;
        if (messageByAgent) return <Icon icon="i-lucide-undo-2" className={extraClass} />;
        if (isMessageAnActivity) return <Icon icon="i-lucide-info" className={extraClass} />;

        return null;
    };

    return (
        <div
            className={`min-w-0 text-sm ${
                multiLine ? 'flex items-start gap-1' : 'grid grid-cols-[auto_1fr] items-center gap-1'
            } ${className}`.trim()}
        >
            {showMessageType && !multiLine ? typeIcon('size-3.5') : null}
            <span className={`min-w-0 text-body-main ${multiLine ? 'line-clamp-2' : 'truncate'}`}>
                {showMessageType && multiLine
                    ? typeIcon('inline-block align-middle size-3.5 ltr:mr-1 rtl:ml-1')
                    : null}
                {isFriendRequest ? (
                    <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1">
                        <Icon icon="i-lucide-user-plus" className="size-3.5" />
                        {t('CHAT_LIST.FRIEND_REQUEST')}
                    </span>
                ) : body.kind === 'sticker' ? (
                    <span className="inline-grid grid-flow-col auto-cols-max items-center gap-1">
                        <Icon icon="i-ph-sticker" className="size-3.5" />
                        {t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT')}
                    </span>
                ) : body.kind === 'text' ? (
                    body.text
                ) : body.kind === 'attachment' ? (
                    <span className="inline-block align-middle truncate">
                        {ATTACHMENT_ICONS[body.fileType] && showMessageType ? (
                            <Icon
                                icon={ATTACHMENT_ICONS[body.fileType]}
                                className="inline-block align-middle size-3.5 ltr:mr-1 rtl:ml-1"
                            />
                        ) : null}
                        <span className="inline-block align-middle">
                            {t(`CHAT_LIST.ATTACHMENTS.${body.fileType}.CONTENT`)}
                        </span>
                    </span>
                ) : (
                    defaultEmptyMessage || t('CHAT_LIST.NO_CONTENT')
                )}
            </span>
        </div>
    );
}
