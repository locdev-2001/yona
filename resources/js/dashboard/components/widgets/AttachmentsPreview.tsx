import Button from 'dashboard/components-next/button/Button';
import { formatBytes } from 'shared/helpers/FileHelper';

// Port từ dashboard/components/widgets/AttachmentsPreview.vue.
export interface PendingAttachment {
    currentChatId: number;
    resource: File;
    isPrivate: boolean;
    thumb: string;
    isVoiceMessage?: boolean;
}

interface AttachmentsPreviewProps {
    attachments: PendingAttachment[];
    className?: string;
    onRemoveAttachment: (attachments: PendingAttachment[]) => void;
}

export default function AttachmentsPreview({ attachments, className = '', onRemoveAttachment }: AttachmentsPreviewProps) {
    const nonRecordedAudioAttachments = attachments.filter(attachment => !attachment.isVoiceMessage);
    const recordedAudioAttachments = attachments.filter(attachment => attachment.isVoiceMessage);

    const onRemove = (itemIndex: number) =>
        onRemoveAttachment(
            nonRecordedAudioAttachments.filter((_, index) => index !== itemIndex).concat(recordedAudioAttachments),
        );

    return (
        <div className={`flex flex-wrap gap-y-1 gap-x-2 overflow-auto max-h-[12.5rem] ${className}`}>
            {nonRecordedAudioAttachments.map((attachment, index) => (
                <div
                    key={`${attachment.resource.name}-${index}`}
                    className="flex items-center p-1 bg-n-slate-3 gap-1 rounded-md w-[15rem]"
                >
                    <div className="max-w-[4rem] flex-shrink-0 w-6 flex items-center">
                        {attachment.resource.type.includes('image') ? (
                            <img className="object-cover w-6 h-6 rounded-sm" src={attachment.thumb} alt="" />
                        ) : (
                            <span className="relative w-6 h-6 text-lg text-left -top-px">📄</span>
                        )}
                    </div>
                    <div className="max-w-3/5 min-w-[50%] overflow-hidden text-ellipsis">
                        <span className="h-4 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">
                            {attachment.resource.name}
                        </span>
                    </div>
                    <div className="w-[30%] justify-center">
                        <span className="overflow-hidden text-xs text-ellipsis whitespace-nowrap">
                            {formatBytes(attachment.resource.size, 0)}
                        </span>
                    </div>
                    <div className="flex items-center justify-center">
                        <Button ghost slate xs icon="i-lucide-x" onClick={() => onRemove(index)} />
                    </div>
                </div>
            ))}
        </div>
    );
}
