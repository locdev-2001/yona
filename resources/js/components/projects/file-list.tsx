import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import type { Project, ProjectAttachment } from '@/types';
import { router } from '@inertiajs/react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { useRef } from 'react';

interface Props {
    project: Project;
    canManage: boolean;
}

export default function FileList({ project, canManage }: Props) {
    const t = useTranslator();
    const attachments = (project.attachments ?? []) as ProjectAttachment[];
    const inputRef = useRef<HTMLInputElement>(null);

    function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        router.post(route('projects.files.store', project.id), formData as unknown as Record<string, string>, {
            preserveScroll: true,
            forceFormData: true,
        });
        e.target.value = '';
    }

    function handleDelete(attachmentId: string) {
        router.delete(route('projects.files.destroy', { project: project.id, attachment: attachmentId }), {
            preserveScroll: true,
        });
    }

    return (
        <div className="space-y-3">
            {canManage && (
                <div>
                    <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
                    <Button size="sm" onClick={() => inputRef.current?.click()}>
                        {t('projects.actions.upload_file')}
                    </Button>
                </div>
            )}

            {attachments.length === 0 && <p className="text-muted-foreground text-sm">No files uploaded yet.</p>}

            <ul className="divide-y rounded-md border">
                {attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-3 px-4 py-3">
                        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-sm">{att.file_name ?? att.path}</span>
                        {att.visible_to_customer && <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Customer</span>}
                        <a href={route('attachments.download', att.attachment_key)} className="text-muted-foreground hover:text-foreground" download>
                            <Download className="h-4 w-4" />
                        </a>
                        {canManage && (
                            <button onClick={() => handleDelete(att.id)} className="text-destructive opacity-50 hover:opacity-100">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
