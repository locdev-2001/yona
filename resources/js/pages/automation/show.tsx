import { EnrollDialog } from '@/components/automation/enroll-dialog';
import { WorkflowCanvas } from '@/components/automation/workflow-canvas';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Pipeline, PipelineStage, User, Workflow, WorkflowGraph } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    workflow: Workflow;
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    members: Pick<User, 'id' | 'name'>[];
}

export default function AutomationShow({ workflow, pipelines, members }: Props) {
    const t = useTranslator();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('automation.title.index'), href: route('automation.workflows.index') },
        { title: workflow.name, href: route('automation.workflows.show', workflow.id) },
    ];

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSave(data: { name: string; is_active: boolean; graph: WorkflowGraph }) {
        router.put(route('automation.workflows.update', workflow.id), data as unknown as Record<string, string>, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onError: (e) => setErrors(e as Record<string, string>),
            onFinish: () => setProcessing(false),
        });
    }

    function handleDelete() {
        if (!confirm(t('automation.canvas.delete_confirm'))) return;
        router.delete(route('automation.workflows.destroy', workflow.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={workflow.name} />

            <div className="flex min-h-0 flex-1 flex-col">
                <WorkflowCanvas
                    initialGraph={workflow.graph}
                    initialName={workflow.name}
                    initialIsActive={workflow.is_active}
                    pipelines={pipelines}
                    members={members}
                    saving={processing}
                    errors={errors}
                    onSave={handleSave}
                    headerActions={
                        <>
                            <EnrollDialog enrollRoute={route('automation.workflows.enroll', workflow.id)} />
                            <Button type="button" variant="destructive" size="icon" onClick={handleDelete} title={t('automation.canvas.delete')}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    }
                />
            </div>
        </AppLayout>
    );
}
