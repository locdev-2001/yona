import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export interface StageData {
    id: string;
    name: string;
    color: string | null;
    stage_order: number;
    probability: number;
    type: string;
}

interface StageListProps {
    pipelineId: string;
    stages: StageData[];
    stageTypes: string[];
    storeRoute: string;
}

type StageDialog = { mode: 'create' } | { mode: 'edit'; stage: StageData };

export default function StageList({ pipelineId, stages, stageTypes, storeRoute }: StageListProps) {
    const t = useTranslator();
    const [dialog, setDialog] = useState<StageDialog | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StageData | null>(null);

    const { data, setData, post, patch, reset, errors, processing } = useForm({
        name: '',
        color: '#3b82f6',
        probability: 0,
        type: 'open' as string,
        stage_order: stages.length,
    });

    const openCreate = () => {
        setData({ name: '', color: '#3b82f6', probability: 0, type: 'open', stage_order: stages.length });
        setDialog({ mode: 'create' });
    };

    const openEdit = (stage: StageData) => {
        setData({
            name: stage.name,
            color: stage.color ?? '#3b82f6',
            probability: stage.probability,
            type: stage.type,
            stage_order: stage.stage_order,
        });
        setDialog({ mode: 'edit', stage });
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
            patch(route('lookups.stage.update', dialog.stage.id), opts);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('lookups.stage.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <>
            <div className="mt-2 space-y-2 pl-4">
                {stages.map((stage) => (
                    <div key={stage.id} className="bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2">
                            {stage.color && <span className="inline-block size-3 rounded-full" style={{ backgroundColor: stage.color }} />}
                            <span className="text-sm">{stage.name}</span>
                            <span className="text-muted-foreground text-xs">({t(`lookups.pipelines.type.${stage.type}`)})</span>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(stage)}>
                                {t('lookups.actions.edit')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(stage)}>
                                <Trash2 className="text-destructive size-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="mr-1 size-3" />
                    {t('lookups.pipelines.add_stage')}
                </Button>
            </div>

            {/* Stage create/edit dialog */}
            <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialog?.mode === 'create' ? t('lookups.pipelines.add_stage') : t('lookups.actions.edit')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>{t('lookups.pipelines.stage_name')}</Label>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('lookups.pipelines.stage_type')}</Label>
                            <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {stageTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {t(`lookups.pipelines.type.${type}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.type} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t('lookups.pipelines.stage_color')}</Label>
                                <Input
                                    type="color"
                                    value={data.color}
                                    onChange={(e) => setData('color', e.target.value)}
                                    className="h-10 w-20 cursor-pointer p-1"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('lookups.pipelines.stage_probability')}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={data.probability}
                                    onChange={(e) => setData('probability', Number(e.target.value))}
                                />
                                <InputError message={errors.probability} />
                            </div>
                        </div>
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

            {/* Delete stage confirmation */}
            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('lookups.actions.delete')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">{t('lookups.pipelines.delete_confirm')}</p>
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
