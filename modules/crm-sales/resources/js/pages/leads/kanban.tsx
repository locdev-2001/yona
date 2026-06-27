import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, KanbanColumn, Lead, Pipeline } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { List, Plus } from 'lucide-react';
import { useState } from 'react';
import LeadCard from './components/lead-card';

interface Props {
    board: KanbanColumn[];
    activePipeline: Pipeline | null;
    pipelines: Pipeline[];
}

export default function LeadsKanban({ board, activePipeline, pipelines }: Props) {
    const t = useTranslator();
    const [dragLead, setDragLead] = useState<Lead | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('leads.title.index') ?? 'Leads', href: route('leads.index') },
        { title: t('leads.title.kanban') ?? 'Kanban', href: route('leads.kanban') },
    ];

    function handlePipelineChange(pipelineId: string) {
        router.get(route('leads.kanban', { pipeline: pipelineId }));
    }

    function handleDragStart(e: React.DragEvent, lead: Lead) {
        setDragLead(lead);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDrop(e: React.DragEvent, stageId: string, targetOrder: number) {
        e.preventDefault();
        if (!dragLead) return;

        // Optimistic: only trigger if stage changed or order changed
        if (dragLead.stage_id === stageId && dragLead.lead_order === targetOrder) {
            setDragLead(null);
            return;
        }

        router.patch(
            route('leads.stage', dragLead.id),
            { stage_id: stageId, order: targetOrder },
            {
                preserveScroll: true,
                onFinish: () => setDragLead(null),
            },
        );
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('leads.title.kanban') ?? 'Kanban'} />

            <div className="flex flex-1 flex-col p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <PageHeader title={t('leads.title.kanban') ?? 'Kanban Board'} />

                    <div className="flex items-center gap-3">
                        <Select value={activePipeline?.id ?? ''} onValueChange={handlePipelineChange}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('leads.fields.pipeline')} />
                            </SelectTrigger>
                            <SelectContent>
                                {pipelines.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('leads.index')}>
                                <List className="mr-2 h-4 w-4" />
                                {t('leads.actions.view_list')}
                            </Link>
                        </Button>

                        <Button size="sm" asChild>
                            <Link href={route('leads.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('leads.actions.create')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {!activePipeline ? (
                    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">{t('leads.kanban.no_pipeline')}</div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {board.map((column) => (
                            <div
                                key={column.stage.id}
                                className="flex w-72 shrink-0 flex-col rounded-lg border bg-gray-50"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.stage.id, column.leads.data.length)}
                            >
                                {/* Column header */}
                                <div className="flex items-center justify-between border-b px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={column.stage.color ? { background: column.stage.color } : undefined}
                                        />
                                        <span className="text-sm font-semibold">{column.stage.name}</span>
                                        <span className="text-muted-foreground text-xs">({column.leads.total})</span>
                                    </div>
                                    {Number(column.total_value) > 0 && (
                                        <span className="text-xs font-medium text-emerald-600">{Number(column.total_value).toLocaleString()}</span>
                                    )}
                                </div>

                                {/* Cards */}
                                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                                    {column.leads.data.map((lead, idx) => (
                                        <div
                                            key={lead.id}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => {
                                                e.stopPropagation();
                                                handleDrop(e, column.stage.id, idx);
                                            }}
                                        >
                                            <LeadCard lead={lead} draggable onDragStart={handleDragStart} />
                                        </div>
                                    ))}

                                    {column.leads.data.length === 0 && (
                                        <div className="text-muted-foreground py-8 text-center text-xs">{t('leads.kanban.empty_stage')}</div>
                                    )}
                                </div>

                                {/* Pagination per column */}
                                {column.leads.last_page > 1 && (
                                    <div className="border-t px-3 py-2 text-center">
                                        <span className="text-muted-foreground text-xs">
                                            {column.leads.current_page} / {column.leads.last_page}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
