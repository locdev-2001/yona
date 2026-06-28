import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useRef } from 'react';

interface Props {
    attachableType: string;
    attachableId: string;
    /** Whether to show the visible_to_customer toggle. */
    showVisibilityToggle?: boolean;
}

/**
 * File upload zone for any entity (P06-P09 embed this next to AttachmentList).
 * Posts to POST /attachments with attachable_type + attachable_id.
 */
export default function AttachmentUploader({ attachableType, attachableId, showVisibilityToggle = false }: Props) {
    const t = useTranslator();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm<{
        file: File | null;
        attachable_type: string;
        attachable_id: string;
        visible_to_customer: boolean;
    }>({
        file: null,
        attachable_type: attachableType,
        attachable_id: attachableId,
        visible_to_customer: false,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('file', file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('attachments.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset('file');
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div
                className="border-muted-foreground/30 hover:border-primary/50 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="text-muted-foreground mb-2 h-6 w-6" />
                <p className="text-muted-foreground text-sm">{t('attachments.drop_zone')}</p>
                {data.file && <p className="mt-1 text-sm font-medium">{data.file.name}</p>}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <InputError message={errors.file} />

            {showVisibilityToggle && (
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.visible_to_customer} onChange={(e) => setData('visible_to_customer', e.target.checked)} />
                    {t('attachments.visible_to_customer')}
                </label>
            )}

            <Button type="submit" disabled={!data.file || processing} size="sm">
                {t('attachments.upload_button')}
            </Button>
        </form>
    );
}
