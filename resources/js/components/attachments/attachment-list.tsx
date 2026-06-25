import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Download, Paperclip, Trash2 } from 'lucide-react';

export interface Attachment {
    id: string;
    original_name: string;
    mime: string | null;
    size: number | null;
    attachment_key: string;
    visible_to_customer: boolean;
    created_at: string;
    uploader?: { id: number; name: string } | null;
    external_link?: string | null;
}

interface Props {
    attachments: Attachment[];
    canDelete?: boolean;
}

/**
 * Renders the attachment list for any entity page (P06-P09 embed this).
 * Download route uses attachment_key — no uuid exposed.
 */
export default function AttachmentList({ attachments, canDelete = false }: Props) {
    const t = useTranslator();
    const { delete: destroy, processing } = useForm();

    if (attachments.length === 0) {
        return <p className="text-muted-foreground text-sm">{t('attachments.no_attachments')}</p>;
    }

    const formatBytes = (bytes: number | null): string => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <ul className="space-y-2">
            {attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{attachment.original_name}</p>
                            {attachment.size && <p className="text-muted-foreground text-xs">{formatBytes(attachment.size)}</p>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                            <a href={route('attachments.download', { attachmentKey: attachment.attachment_key })}>
                                <Download className="h-4 w-4" />
                                <span className="sr-only">{t('attachments.download')}</span>
                            </a>
                        </Button>
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={processing}
                                onClick={() => {
                                    if (confirm(t('attachments.delete_confirm'))) {
                                        destroy(route('attachments.destroy', { attachment: attachment.id }));
                                    }
                                }}
                            >
                                <Trash2 className="text-destructive h-4 w-4" />
                                <span className="sr-only">{t('attachments.deleted')}</span>
                            </Button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export { AttachmentList };
