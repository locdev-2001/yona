import { t } from '../../../../i18n';
import { messagePreviewBody } from 'dashboard/components-next/message/helpers/messagePreview';
import Icon from 'dashboard/components-next/icon/Icon';
import HighlightedText from 'dashboard/search/components/HighlightedText';
import { MESSAGE_TYPES } from '../../../conversation/constants';
import type { ConversationMessage } from '../../../conversation/types';
import { ICONS } from 'dashboard/icons';

// Trích ATTACHMENT_ICONS của shared/constants/messages.js.
const ATTACHMENT_ICONS: Record<string, string> = {
    image: ICONS.attachmentImage,
    audio: ICONS.attachmentAudio,
    video: ICONS.attachmentVideo,
    file: ICONS.attachmentFile,
    location: ICONS.attachmentLocation,
    fallback: ICONS.attachmentLink,
};

// Port từ dashboard/components/widgets/conversation/MessagePreview.vue
interface MessagePreviewProps {
    message: ConversationMessage;
    showMessageType?: boolean;
    defaultEmptyMessage?: string;
    className?: string;
    highlightQuery?: string;
    // Tên người gửi đứng trước nội dung ("Bạn", thành viên nhóm, nhân viên khác).
    senderLabel?: string | null;
}

export default function MessagePreview({
    message,
    showMessageType = true,
    defaultEmptyMessage = '',
    className = '',
    highlightQuery = '',
    senderLabel = null,
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
                    <span className={`${ICONS.privateNote} size-4 ${typeIconClass}`} aria-hidden="true" />
                ) : messageByAgent && !senderLabel ? (
                    <span className={`${ICONS.reply} size-4 ${typeIconClass}`} aria-hidden="true" />
                ) : isMessageAnActivity ? (
                    <span className={`${ICONS.info} size-4 ${typeIconClass}`} aria-hidden="true" />
                ) : null
            ) : null}
            {senderLabel ? <span data-testid="preview-sender">{`${senderLabel}: `}</span> : null}
            {body.kind === 'sticker' ? (
                <span>
                    <Icon icon={ICONS.sticker} className="-mt-0.5 align-middle inline-block text-n-slate-11 size-4" />{' '}
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
                        <span className={`${ATTACHMENT_ICONS[body.fileType]} size-4 -mt-0.5 align-middle inline-block text-n-slate-11`} aria-hidden="true" />
                    ) : null}{' '}
                    {t(`CHAT_LIST.ATTACHMENTS.${body.fileType}.CONTENT`)}
                </span>
            ) : (
                <span>{defaultEmptyMessage || t('CHAT_LIST.NO_CONTENT')}</span>
            )}
        </div>
    );
}
