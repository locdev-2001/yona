import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import StageList, { type StageData } from './_stage-list';

interface PipelineData {
    id: string;
    name: string;
    is_default: boolean;
    stages: StageData[];
}

interface Props {
    pipelines: PipelineData[];
    stageTypes: string[];
}

type PipelineDialog = { mode: 'create' } | { mode: 'edit'; pipeline: PipelineData };

export default function PipelinesSettings({ pipelines, stageTypes }: Props) {
    const t = useTranslator();
    const [dialog, setDialog] = useState<PipelineDialog | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PipelineData | null>(null);

    const { data, setData, post, patch, reset, errors, processing } = useForm({
        name: '',
        is_default: false as boolean,
    });

    const openCreate = () => {
        setData({ name: '', is_default: false });
        setDialog({ mode: 'create' });
    };

    const openEdit = (pipeline: PipelineData) => {
        setData({ name: pipeline.name, is_default: pipeline.is_default });
        setDialog({ mode: 'edit', pipeline });
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
            post(route('lookups.pipelines.store'), opts);
        } else {
            patch(route('lookups.pipelines.update', dialog.pipeline.id), opts);
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('lookups.pipelines.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('lookups.pipelines.title'), href: '/settings/lookups/pipelines' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookups.pipelines.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <HeadingSmall title={t('lookups.pipelines.title')} description={t('lookups.pipelines.subtitle')} />
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-2 size-4" />
                            {t('lookups.pipelines.add')}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {pipelines.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{t('lookups.pipelines.empty')}</p>
                        ) : (
                            pipelines.map((pipeline) => (
                                <div key={pipeline.id} className="rounded-xl border p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold">{pipeline.name}</span>
                                            {pipeline.is_default && (
                                                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                                                    {t('lookups.pipelines.is_default')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(pipeline)}>
                                                {t('lookups.actions.edit')}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(pipeline)}>
                                                <Trash2 className="text-destructive size-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <StageList
                                        pipelineId={pipeline.id}
                                        stages={pipeline.stages}
                                        stageTypes={stageTypes}
                                        storeRoute={route('lookups.stages.store', pipeline.id)}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Create / Edit pipeline dialog */}
                <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{dialog?.mode === 'create' ? t('lookups.pipelines.add') : t('lookups.actions.edit')}</DialogTitle>
                            <DialogDescription>{t('lookups.dialog_description') ?? 'Enter the details below.'}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>{t('lookups.pipelines.name')}</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                                <InputError message={errors.name} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="is_default"
                                    checked={data.is_default}
                                    onCheckedChange={(checked) => setData('is_default', checked === true)}
                                />
                                <Label htmlFor="is_default">{t('lookups.pipelines.is_default')}</Label>
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

                {/* Delete pipeline dialog */}
                <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('lookups.actions.delete')}</DialogTitle>
                            <DialogDescription>{t('lookups.delete_dialog_description') ?? 'This action cannot be undone.'}</DialogDescription>
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
            </SettingsLayout>
        </AppLayout>
    );
}
