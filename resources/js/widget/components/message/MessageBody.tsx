import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { isDeletedMessage } from '../../helpers/messageHelpers';
import { widgetStore } from '../../store/widgetStore';
import { AudioBubble, FileBubble, VideoBubble } from '../bubbles';
import { bubbleRadius, partPosition } from './bubbleShape';
import DeletedBubble from './DeletedBubble';
import ImageGrid from './ImageGrid';
import QuotedReply from './QuotedReply';
import StickerBubble from './StickerBubble';
import type { MessageAttachment, WidgetMessage } from '../../types';

function TextBubble({
    content,
    replyTo,
    isOwn,
    position,
}: {
    content: string;
    replyTo: WidgetMessage | null;
    isOwn: boolean;
    position: MessageGroupPosition;
}) {
    const tone = isOwn
        ? 'bg-[var(--yona-chat-solid)] text-[var(--yona-chat-on-solid)]'
        : 'border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-ink)]';
    const spacing = replyTo ? 'flex flex-col gap-[7px] p-[6px] pb-[10px]' : 'px-[13px] py-[9px]';

    return (
        <div className={`yona-text-bubble max-w-full text-[13.5px] leading-[1.5] ${tone} ${spacing}`} style={bubbleRadius(isOwn, position)}>
            {replyTo ? <QuotedReply replyTo={replyTo} isOwn={isOwn} /> : null}
            {content ? (
                <div
                    className={`message-content break-words [&_a]:underline ${replyTo ? 'px-[7px]' : ''}`}
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(new MessageFormatter(content, false).formattedMessage),
                    }}
                />
            ) : null}
        </div>
    );
}

// Video/âm thanh phát ngay trong khung; video không phát được (định dạng trình duyệt
// không giải mã được) rơi về thẻ tệp để khách vẫn tải về xem.
function OtherAttachment({
    attachment,
    isInProgress,
    onCancelUpload,
}: {
    attachment: MessageAttachment;
    isInProgress: boolean;
    onCancelUpload: () => void;
}) {
    const [hasMediaError, setMediaError] = useState(false);
    const url = attachment.data_url ?? '';

    if (attachment.file_type === 'video' && !hasMediaError) {
        return <VideoBubble url={url} onError={() => setMediaError(true)} />;
    }
    if (attachment.file_type === 'audio') return <AudioBubble url={url} />;

    return <FileBubble attachment={attachment} isInProgress={isInProgress} onCancelUpload={onCancelUpload} />;
}

const attachmentKeyOf = (attachment: MessageAttachment, index: number): string =>
    String(attachment.id ?? attachment.data_url ?? `attachment-${index}`);

interface MessageBodyProps {
    message: WidgetMessage;
    replyTo: WidgetMessage | null;
    isOwn: boolean;
    position: MessageGroupPosition;
}

// Thân một tin, dùng chung cho tin của khách và của agent: khối chữ (kèm trích
// dẫn), lưới ảnh, tệp; tin thu hồi thành bong bóng nét đứt, sticker đứng trần.
export default function MessageBody({ message, replyTo, isOwn, position }: MessageBodyProps) {
    // Ảnh tải hỏng chỉ hạ riêng ảnh đó xuống thẻ tệp; các ảnh còn lại giữ lưới.
    const [failedImageKeys, setFailedImageKeys] = useState<ReadonlySet<string>>(() => new Set());

    useEffect(() => setFailedImageKeys(new Set()), [message.attachments]);

    if (isDeletedMessage(message)) return <DeletedBubble isOwn={isOwn} position={position} />;
    if (message.content_type === 'sticker') return <StickerBubble message={message} />;

    const attachments = message.attachments ?? [];
    const images = attachments.filter(
        (attachment, index) => attachment.file_type === 'image' && !failedImageKeys.has(attachmentKeyOf(attachment, index)),
    );
    const others = attachments.filter(attachment => !images.includes(attachment));
    const markImageFailed = (image: MessageAttachment) => {
        const imageKey = attachmentKeyOf(image, attachments.indexOf(image));
        setFailedImageKeys(current => (current.has(imageKey) ? current : new Set(current).add(imageKey)));
    };
    const isInProgress = message.status === 'in_progress';
    const content = message.content ?? '';

    const parts: ((partPositionValue: MessageGroupPosition) => ReactNode)[] = [];
    if (content || replyTo) {
        parts.push(partPositionValue => (
            <TextBubble key="text" content={content} replyTo={replyTo} isOwn={isOwn} position={partPositionValue} />
        ));
    }
    if (images.length) {
        parts.push(partPositionValue => (
            <ImageGrid
                key="images"
                images={images}
                isOwn={isOwn}
                position={partPositionValue}
                onImageError={markImageFailed}
            />
        ));
    }
    others.forEach((attachment, index) => {
        parts.push(() => (
            <OtherAttachment
                key={attachment.id ?? attachment.data_url ?? `file-${index}`}
                attachment={attachment}
                isInProgress={isInProgress}
                onCancelUpload={() => widgetStore.cancelSend(message.id)}
            />
        ));
    });

    return <>{parts.map((renderPart, index) => renderPart(partPosition(position, index, parts.length)))}</>;
}
