import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface Note {
    id: string;
    body: string;
    date_contacted: string | null;
    created_at: string;
    author?: { id: number; name: string } | null;
}

interface NoteFormProps {
    noteableType: string;
    noteableId: string;
    initial?: { id: string; body: string; date_contacted: string | null };
    onCancel?: () => void;
}

function NoteForm({ noteableType, noteableId, initial, onCancel }: NoteFormProps) {
    const t = useTranslator();
    const isEdit = !!initial;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        noteable_type: noteableType,
        noteable_id: noteableId,
        body: initial?.body ?? '',
        date_contacted: initial?.date_contacted ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(route('notes.update', { note: initial!.id }), {
                preserveScroll: true,
                onSuccess: () => onCancel?.(),
            });
        } else {
            post(route('notes.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    reset('body', 'date_contacted');
                    onCancel?.();
                },
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
                value={data.body}
                onChange={(e) => setData('body', e.target.value)}
                placeholder={t('notes.write_note')}
                rows={3}
                className="focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            />
            <InputError message={errors.body} />
            <div className="flex items-center gap-2">
                <label className="text-muted-foreground shrink-0 text-xs">{t('notes.date_contacted')}</label>
                <input
                    type="date"
                    value={data.date_contacted ?? ''}
                    onChange={(e) => setData('date_contacted', e.target.value || '')}
                    className="rounded-md border px-2 py-1 text-sm"
                />
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!data.body.trim() || processing}>
                    {t('notes.save')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        {t('notes.cancel')}
                    </Button>
                )}
            </div>
        </form>
    );
}

interface Props {
    notes: Note[];
    noteableType: string;
    noteableId: string;
    currentUserId?: number | null;
    canManage?: boolean;
}

/**
 * Note list + add form for any entity page (P06-P09).
 * date_contacted is displayed; P07 reads it from the DB for lead.last_contact.
 */
export default function NoteList({ notes, noteableType, noteableId, currentUserId, canManage = false }: Props) {
    const t = useTranslator();
    const [editingId, setEditingId] = useState<string | null>(null);
    const { delete: destroy, processing } = useForm();

    return (
        <div className="space-y-4">
            <NoteForm noteableType={noteableType} noteableId={noteableId} />

            {notes.length === 0 ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    {t('notes.no_notes')}
                </div>
            ) : (
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div key={note.id}>
                            {editingId === note.id ? (
                                <NoteForm
                                    noteableType={noteableType}
                                    noteableId={noteableId}
                                    initial={{ id: note.id, body: note.body, date_contacted: note.date_contacted }}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <div className="rounded-md border p-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-xs font-medium">{note.author?.name ?? '—'}</span>
                                        <span className="text-muted-foreground text-xs">{note.created_at}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                                    {note.date_contacted && (
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {t('notes.date_contacted')}: {note.date_contacted}
                                        </p>
                                    )}
                                    {(canManage || note.author?.id === currentUserId) && (
                                        <div className="mt-2 flex gap-1">
                                            <Button type="button" variant="ghost" size="sm" className="h-6" onClick={() => setEditingId(note.id)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive h-6"
                                                disabled={processing}
                                                onClick={() => {
                                                    if (confirm(t('notes.delete_confirm'))) {
                                                        destroy(route('notes.destroy', { note: note.id }), {
                                                            preserveScroll: true,
                                                        });
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export { NoteList };
