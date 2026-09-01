import { t } from '../../../../i18n';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { getPlainText } from 'shared/helpers/MessageFormatter';
import { MESSAGE_TYPES } from '../../../conversation/constants';
import type { ConversationMessage } from '../../../conversation/types';

// Trích ATTACHMENT_ICONS của shared/constants/messages.js (icon fluent).
const ATTACHMENT_ICONS: Record<string, string> = {
    image: 'image',
    audio: 'headphones-sound-wave',
    video: 'video',
    file: 'document',
    location: 'location',
    fallback: 'link',
};

// Port từ dashboard/components/widgets/conversation/MessagePreview.vue
interface MessagePreviewProps {
    message: ConversationMessage;
    showMessageType?: boolean;
    defaultEmptyMessage?: string;
    className?: string;
}

export default function MessagePreview({
    message,
    showMessageType = true,
    defaultEmptyMessage = '',
    className = '',
}: MessagePreviewProps) {
    const messageByAgent = message.message_type === MESSAGE_TYPES.OUTGOING;
    const isMessageAnActivity = message.message_type === MESSAGE_TYPES.ACTIVITY;
    const isMessagePrivate = message.private;
    const isMessageSticker = message.content_type === 'sticker';

    const emailSubject = (message.content_attributes as { email?: { subject?: string } } | null)?.email?.subject;
    const parsedLastMessage = getPlainText(emailSubject || message.content);

    const [firstAttachment] = message.attachments ?? [];
    const lastMessageFileType = (firstAttachment as { file_type?: string } | undefined)?.file_type ?? '';
    const attachmentIcon = ATTACHMENT_ICONS[lastMessageFileType];

    const typeIconClass = '-mt-0.5 align-middle text-n-slate-11 inline-block';

    return (
        <div className={`overflow-hidden text-ellipsis whitespace-nowrap ${className}`.trim()}>
            {showMessageType ? (
                isMessagePrivate ? (
                    <FluentIcon size={16} className={typeIconClass} icon="lock-closed" />
                ) : messageByAgent ? (
                    <FluentIcon size={16} className={typeIconClass} icon="arrow-reply" />
                ) : isMessageAnActivity ? (
                    <FluentIcon size={16} className={typeIconClass} icon="info" />
                ) : null
            ) : null}
            {message.content && isMessageSticker ? (
                <span>
                    <FluentIcon size={16} className="-mt-0.5 align-middle inline-block text-n-slate-11" icon="image" />{' '}
                    {t('CHAT_LIST.ATTACHMENTS.image.CONTENT')}
                </span>
            ) : message.content ? (
                <span>{parsedLastMessage}</span>
            ) : message.attachments ? (
                <span>
                    {attachmentIcon && showMessageType ? (
                        <FluentIcon
                            size={16}
                            className="-mt-0.5 align-middle inline-block text-n-slate-11"
                            icon={attachmentIcon}
                        />
                    ) : null}{' '}
                    {t(`CHAT_LIST.ATTACHMENTS.${lastMessageFileType}.CONTENT`)}
                </span>
            ) : (
                <span>{defaultEmptyMessage || t('CHAT_LIST.NO_CONTENT')}</span>
            )}
        </div>
    );
}
