import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import AttachmentChips from '../chips/AttachmentChips';
import MediaGrid from '../chips/MediaGrid';
import { groupAttachmentChips } from '../helpers/attachments';
import { emphasizeMentions, readGroupMentions } from '../helpers/groupSender';
import { useMessageContext } from '../provider';

// Tin có ảnh/video: lưới sát viền bong bóng (bo góc theo bong bóng), chú thích
// và tệp khác nằm dưới lưới trong cùng bong bóng. Bề ngang bong bóng theo lưới.
export default function MediaBubble({ dataBubbleName }: { dataBubbleName: string }) {
    const { content, attachments, contentAttributes } = useMessageContext();
    const { media, recordings, files } = groupAttachmentChips(attachments);
    const otherAttachments = [...recordings, ...files];
    const displayContent = content ? emphasizeMentions(content, readGroupMentions(contentAttributes)) : content;
    const hasFooter = Boolean(displayContent) || otherAttachments.length > 0;

    return (
        <BaseBubble className="overflow-hidden" flush dataBubbleName={dataBubbleName}>
            <MediaGrid media={media} />
            {hasFooter ? (
                <div data-media-caption className="flex flex-col w-0 min-w-full gap-2 px-3 py-2">
                    {displayContent ? <FormattedContent content={displayContent} /> : null}
                    <AttachmentChips attachments={otherAttachments} className="gap-2" />
                </div>
            ) : null}
        </BaseBubble>
    );
}
