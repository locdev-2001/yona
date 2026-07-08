import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface LookupItem {
    id: string;
    name: string;
    color?: string | null;
    status_order?: number;
}

interface LookupTableProps {
    items: LookupItem[];
    storeRoute: string;
    updateRouteFn: (id: string) => string;
    deleteRouteFn: (id: string) => string;
    addLabel: string;
    emptyLabel: string;
    showColor?: boolean;
}

type EditDialog = { mode: 'create' } | { mode: 'edit'; item: LookupItem };

export default function LookupTable({ items, storeRoute, updateRouteFn, deleteRouteFn, addLabel, emptyLabel, showColor = false }: LookupTableProps) {
    const t = useTranslator();
    const [dialog, setDialog] = useState<EditDialog | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LookupItem | null>(null);

    const { data, setData, post, patch, reset, errors, processing } = useForm({
        name: '',
        color: '',
    });

    const openCreate = () => {
        reset();
        setData({ name: '', color: '' });
        setDialog({ mode: 'create' });
    };

    const openEdit = (item: LookupItem) => {
        setData({ name: item.name, color: item.color ?? '' });
        setDialog({ mode: 'edit', item });
    };

    const submit = () => {
        if (!dialog) return;
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                setDialog(null);
                reset();
            },
        };

        if (dialog.mode === 'create') {
            post(storeRoute, opts);
        } else {
            patch(updateRouteFn(dialog.item.id), opts);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(deleteRouteFn(deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-2 size-4" />
                        {addLabel}
                    </Button>
                </div>

                <div className="rounded-xl border">
                    {items.length === 0 ? (
                        <p className="text-muted-foreground p-4 text-sm">{emptyLabel}</p>
                    ) : (
                        <ul className="divide-y">
                            {items.map((item) => (
                                <li key={item.id} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {showColor && item.color && (
                                            <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: item.color }} />
                                        )}
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
                                            <Trash2 className="text-destructive size-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Create / Edit dialog */}
            <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialog?.mode === 'create' ? addLabel : t('lookups.actions.edit')}</DialogTitle>
                        <DialogDescription>{t('lookups.dialog_description') ?? 'Enter the details below.'}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('lookups.lead_sources.name')}</Label>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                            <InputError message={errors.name} />
                        </div>
                        {showColor && (
                            <div className="grid gap-2">
                                <Label>{t('lookups.project_statuses.color')}</Label>
                                <Input
                                    type="color"
                                    value={data.color || '#94a3b8'}
                                    onChange={(e) => setData('color', e.target.value)}
                                    className="h-10 w-20 cursor-pointer p-1"
                                />
                                <InputError message={errors.color} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>
                            {t('lookups.actions.cancel')}
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            {t('lookups.actions.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('lookups.actions.delete')}</DialogTitle>
                        <DialogDescription>{t('lookups.delete_dialog_description') ?? 'This action cannot be undone.'}</DialogDescription>
                    </DialogHeader>
                    <p className="text-sm">{t('lookups.lead_sources.delete_confirm')}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            {t('lookups.actions.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            {t('lookups.actions.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
