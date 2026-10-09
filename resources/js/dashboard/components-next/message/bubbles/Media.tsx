import Loader from 'shared/components/loader/Loader';
import BaseBubble, { bubbleSurfaceClass } from './Base';
import FormattedContent from './FormattedContent';
import AttachmentChips from '../chips/AttachmentChips';
import MediaGrid from '../chips/MediaGrid';
import { MESSAGE_STATUS, ORIENTATION } from '../constants';
import { groupAttachmentChips } from '../helpers/attachments';
import { emphasizeMentions, readGroupMentions } from '../helpers/groupSender';
import { useMessageContext } from '../provider';

// Tin có ảnh/video: khối ảnh đứng riêng không nền, bo góc, rộng đúng theo lưới.
// Chữ và tệp khác đi kèm là một bong bóng riêng ngay dưới, cả hai căn theo phía
// người gửi như tin thẻ liên kết.
export default function MediaBubble({ dataBubbleName }: { dataBubbleName: string }) {
    const { content, attachments, contentAttributes, status, variant, orientation, groupPosition } =
        useMessageContext();
    const isUploading = status === MESSAGE_STATUS.PROGRESS;
    const { media, recordings, files } = groupAttachmentChips(attachments);
    const otherAttachments = [...recordings, ...files];
    const displayContent = content ? emphasizeMentions(content, readGroupMentions(contentAttributes)) : content;
    const hasCaption = Boolean(displayContent) || otherAttachments.length > 0;
    const sideAlignClass = orientation === ORIENTATION.RIGHT ? 'items-end' : 'items-start';

    return (
        <BaseBubble bare className={`flex flex-col gap-1 ${sideAlignClass}`} dataBubbleName={dataBubbleName}>
            <div data-media-block className="relative overflow-hidden rounded-2xl w-fit max-w-full">
                <MediaGrid media={media} />
                {isUploading ? (
                    <div
                        data-media-uploading
                        className="absolute inset-0 grid place-content-center bg-n-black/30 text-white pointer-events-none"
                    >
                        <Loader size={32} />
                    </div>
                ) : null}
            </div>
            {hasCaption ? (
                <div
                    data-media-caption
                    className={`flex flex-col max-w-full min-w-0 gap-2 px-4 py-3 overflow-hidden ${bubbleSurfaceClass(variant, orientation, groupPosition)}`}
                >
                    {displayContent ? <FormattedContent content={displayContent} /> : null}
                    <AttachmentChips attachments={otherAttachments} className="gap-2" />
                </div>
            ) : null}
        </BaseBubble>
    );
}
