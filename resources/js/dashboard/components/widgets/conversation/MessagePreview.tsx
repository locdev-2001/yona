import { t } from '../../../../i18n';
import { messagePreviewBody } from 'dashboard/components-next/message/helpers/messagePreview';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import HighlightedText from 'dashboard/search/components/HighlightedText';
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
    highlightQuery?: string;
}

export default function MessagePreview({
    message,
    showMessageType = true,
    defaultEmptyMessage = '',
    className = '',
    highlightQuery = '',
}: MessagePreviewProps) {
    const messageByAgent = message.message_type === MESSAGE_TYPES.OUTGOING;
    const isMessageAnActivity = message.message_type === MESSAGE_TYPES.ACTIVITY;
    const isMessagePrivate = message.private;
    const body = messagePreviewBody(message);

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
            {body.kind === 'sticker' ? (
                <span>
                    <Icon icon="i-ph-sticker" className="-mt-0.5 align-middle inline-block text-n-slate-11 size-4" />{' '}
                    {t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT')}
                </span>
            ) : body.kind === 'text' ? (
                highlightQuery ? (
                    <HighlightedText text={body.text} query={highlightQuery} />
                ) : (
                    <span>{body.text}</span>
                )
            ) : body.kind === 'attachment' ? (
                <span>
                    {ATTACHMENT_ICONS[body.fileType] && showMessageType ? (
                        <FluentIcon
                            size={16}
                            className="-mt-0.5 align-middle inline-block text-n-slate-11"
                            icon={ATTACHMENT_ICONS[body.fileType]}
                        />
                    ) : null}{' '}
                    {t(`CHAT_LIST.ATTACHMENTS.${body.fileType}.CONTENT`)}
                </span>
            ) : (
                <span>{defaultEmptyMessage || t('CHAT_LIST.NO_CONTENT')}</span>
            )}
        </div>
    );
}
