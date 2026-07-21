import { WorkflowCanvas } from '@/components/automation/workflow-canvas';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Pipeline, PipelineStage, User, WorkflowGraph } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    members: Pick<User, 'id' | 'name'>[];
}

/** Blank canvas: 1 start node (trigger picked in the inspector) → 1 end node,
 * the same 3-node minimum a valid graph needs (ValidatesWorkflowGraph:
 * exactly 1 start node, no dangling edges). */
const DEFAULT_GRAPH: WorkflowGraph = {
    nodes: [
        { id: 'n_start', type: 'start', config: { trigger: 'lead_created' } },
        { id: 'n_end', type: 'end', config: {} },
    ],
    edges: [{ from: 'n_start', to: 'n_end', branch: null }],
};

export default function AutomationCreate({ pipelines, members }: Props) {
    const t = useTranslator();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('automation.title.index'), href: route('automation.workflows.index') },
        { title: t('automation.title.create'), href: route('automation.workflows.create') },
    ];

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSave(data: { name: string; is_active: boolean; graph: WorkflowGraph }) {
        router.post(route('automation.workflows.store'), data as unknown as Record<string, string>, {
            onStart: () => setProcessing(true),
            onError: (e) => setErrors(e as Record<string, string>),
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('automation.title.create')} />

            <div className="flex min-h-0 flex-1 flex-col">
                <WorkflowCanvas
                    initialGraph={DEFAULT_GRAPH}
                    initialName=""
                    initialIsActive={false}
                    pipelines={pipelines}
                    members={members}
                    saving={processing}
                    errors={errors}
                    onSave={handleSave}
                />
            </div>
        </AppLayout>
    );
}
