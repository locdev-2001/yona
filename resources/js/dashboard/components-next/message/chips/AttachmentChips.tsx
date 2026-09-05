import { ATTACHMENT_TYPES, ORIENTATION } from '../constants';
import { groupAttachmentChips } from '../helpers/attachments';
import type { MessageAttachment } from '../helpers/attachments';
import { useMessageContext } from '../provider';
import AudioChip from './Audio';
import FileChip from './File';
import ImageChip from './Image';
import VideoChip from './Video';

// Port từ dashboard/components-next/message/chips/AttachmentChips.vue.
interface AttachmentChipsProps {
    attachments: MessageAttachment[] | undefined | null;
    className?: string;
}

export default function AttachmentChips({ attachments, className = '' }: AttachmentChipsProps) {
    const { orientation } = useMessageContext();
    const { media, recordings, files } = groupAttachmentChips(attachments);

    const groupClass = [className, 'flex', 'flex-wrap', orientation === ORIENTATION.RIGHT ? 'justify-end' : '']
        .filter(Boolean)
        .join(' ');

    return (
        <>
            {media.length ? (
                <div className={groupClass}>
                    {media.map((attachment) =>
                        attachment.file_type === ATTACHMENT_TYPES.IMAGE ? (
                            <ImageChip key={attachment.id} attachment={attachment} />
                        ) : (
                            <VideoChip key={attachment.id} attachment={attachment} />
                        ),
                    )}
                </div>
            ) : null}
            {recordings.length ? (
                <div className={groupClass}>
                    {recordings.map((attachment) => (
                        <div key={attachment.id}>
                            <AudioChip
                                className="bg-n-alpha-3 dark:bg-n-alpha-2 text-n-slate-12"
                                attachment={attachment}
                            />
                        </div>
                    ))}
                </div>
            ) : null}
            {files.length ? (
                <div className={groupClass}>
                    {files.map((attachment) => (
                        <FileChip key={attachment.id} attachment={attachment} />
                    ))}
                </div>
            ) : null}
        </>
    );
}
