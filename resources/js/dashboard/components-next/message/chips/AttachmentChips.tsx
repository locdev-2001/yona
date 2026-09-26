import { ORIENTATION } from '../constants';
import { groupAttachmentChips } from '../helpers/attachments';
import type { MessageAttachment } from '../helpers/attachments';
import { useMessageContext } from '../provider';
import AudioChip from './Audio';
import FileChip from './File';
import MediaGrid from './MediaGrid';

interface AttachmentChipsProps {
    attachments: MessageAttachment[] | undefined | null;
    className?: string;
}

// Đính kèm đứng trong khung có đệm (thư, tin chữ): lưới ảnh/video tự bo góc,
// ghi âm, rồi các thẻ tệp xếp dọc.
export default function AttachmentChips({ attachments, className = '' }: AttachmentChipsProps) {
    const { orientation } = useMessageContext();
    const { media, recordings, files } = groupAttachmentChips(attachments);

    const recordingGroupClass = [className, 'flex', 'flex-wrap', orientation === ORIENTATION.RIGHT ? 'justify-end' : '']
        .filter(Boolean)
        .join(' ');

    return (
        <>
            {media.length ? <MediaGrid media={media} className="overflow-hidden rounded-xl w-fit max-w-full" /> : null}
            {recordings.length ? (
                <div className={recordingGroupClass}>
                    {recordings.map((attachment) => (
                        <div key={attachment.id}>
                            <AudioChip
                                className="bg-n-alpha-3 text-n-slate-12"
                                attachment={attachment}
                            />
                        </div>
                    ))}
                </div>
            ) : null}
            {files.length ? (
                <div data-file-list className={`flex flex-col min-w-0 ${className}`}>
                    {files.map((attachment) => (
                        <FileChip key={attachment.id} attachment={attachment} />
                    ))}
                </div>
            ) : null}
        </>
    );
}
