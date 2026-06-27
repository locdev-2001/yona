import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { AttachmentList } from '@/components/attachments/attachment-list';
import type { CustomFieldDefinition } from '@/components/custom-fields/types';
import { NoteList } from '@/components/notes/note-list';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, Lead, LeadSource, PipelineStage, User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronDown, Globe, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import LeadAssignPopover from './components/lead-assign-popover';
import LeadConvertDialog from './components/lead-convert-dialog';

interface Props {
    lead: Lead;
    fieldDefs: CustomFieldDefinition[];
    sources: LeadSource[];
    members: Pick<User, 'id' | 'name'>[];
    clients: Pick<Client, 'id' | 'name'>[];
    allPipelineStages: PipelineStage[];
}

export default function LeadShow({ lead, fieldDefs, sources, members, clients, allPipelineStages }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('leads.title.index') ?? 'Leads', href: route('leads.index') },
        { title: lead.name, href: route('leads.show', lead.id) },
    ];

    function handleDelete() {
        if (!confirm(t('leads.actions.delete') + '?')) return;
        router.delete(route('leads.destroy', lead.id));
    }

    function handleMarkLost() {
        router.post(route('leads.lost', lead.id));
    }

    function handleMarkJunk() {
        router.post(route('leads.junk', lead.id));
    }

    function handleRestore() {
        router.post(route('leads.restore-status', lead.id));
    }

    const isActive = !lead.is_lost && !lead.is_junk && !lead.date_converted;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={lead.name} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <PageHeader title={lead.name} />
                            <span className="text-muted-foreground text-sm">#{lead.lead_number}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            {lead.stage && (
                                <Badge
                                    variant="outline"
                                    style={lead.stage.color ? { borderColor: lead.stage.color, color: lead.stage.color } : undefined}
                                >
                                    {lead.stage.name}
                                </Badge>
                            )}
                            {lead.is_lost && <Badge variant="destructive">{t('leads.status.lost')}</Badge>}
                            {lead.is_junk && <Badge variant="secondary">{t('leads.status.junk')}</Badge>}
                            {lead.date_converted && <Badge variant="outline">{t('leads.status.converted')}</Badge>}
                            {lead.is_public && <Badge variant="secondary">{t('leads.fields.is_public')}</Badge>}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                        {!lead.date_converted && <LeadAssignPopover lead={lead} members={members} />}

                        {/* Primary CTA: Convert (only when active) */}
                        {isActive && <LeadConvertDialog lead={lead} clients={clients} />}

                        {/* Status actions grouped in dropdown */}
                        {(isActive || lead.is_lost || lead.is_junk) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        {t('leads.actions.more') ?? 'More'}
                                        <ChevronDown className="ml-1 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {isActive && (
                                        <>
                                            <DropdownMenuItem onClick={handleMarkLost}>
                                                {t('leads.actions.mark_lost')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleMarkJunk}>
                                                {t('leads.actions.mark_junk')}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {(lead.is_lost || lead.is_junk) && (
                                        <DropdownMenuItem onClick={handleRestore}>
                                            {t('leads.actions.restore')}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('leads.edit', lead.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('leads.actions.edit')}
                            </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('leads.actions.delete')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left: profile card */}
                    <div className="space-y-4 rounded-lg border p-4">
                        {lead.company && (
                            <div className="flex items-center gap-2 text-sm">
                                <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                                {lead.company}
                            </div>
                        )}
                        {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
                                <a href={`mailto:${lead.email}`} className="hover:underline">
                                    {lead.email}
                                </a>
                            </div>
                        )}
                        {lead.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                                {lead.phone}
                            </div>
                        )}
                        {lead.website && (
                            <div className="flex items-center gap-2 text-sm">
                                <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {lead.website}
                                </a>
                            </div>
                        )}

                        <hr />

                        <div className="space-y-2 text-sm">
                            {lead.assignee && (
                                <div>
                                    <span className="text-muted-foreground">{t('leads.fields.assigned_to')}: </span>
                                    {lead.assignee.name}
                                </div>
                            )}
                            {lead.pipeline && (
                                <div>
                                    <span className="text-muted-foreground">{t('leads.fields.pipeline')}: </span>
                                    {lead.pipeline.name}
                                </div>
                            )}
                            {lead.source && (
                                <div>
                                    <span className="text-muted-foreground">{t('leads.fields.source')}: </span>
                                    {lead.source.name}
                                </div>
                            )}
                            {lead.lead_value && (
                                <div>
                                    <span className="text-muted-foreground">{t('leads.fields.lead_value')}: </span>
                                    <span className="font-semibold text-emerald-600">{Number(lead.lead_value).toLocaleString()}</span>
                                </div>
                            )}
                            {lead.converted_client && (
                                <div>
                                    <span className="text-muted-foreground">{t('leads.status.converted')}: </span>
                                    <Link href={route('clients.show', lead.converted_client.id)} className="hover:underline">
                                        {lead.converted_client.name}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Custom field values */}
                        {fieldDefs.length > 0 && Object.keys(lead.custom_fields).length > 0 && (
                            <>
                                <hr />
                                <div className="space-y-1.5 text-sm">
                                    {fieldDefs.map((def) => {
                                        const value = lead.custom_fields[def.slug];
                                        if (value === undefined || value === null || value === '') return null;
                                        return (
                                            <div key={def.slug}>
                                                <span className="text-muted-foreground">{def.name}: </span>
                                                <span>{String(value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: tabs */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="activity">
                            <TabsList>
                                <TabsTrigger value="activity">{t('platform.tabs.activity') ?? 'Activity'}</TabsTrigger>
                                <TabsTrigger value="notes">{t('platform.tabs.notes') ?? 'Notes'}</TabsTrigger>
                                <TabsTrigger value="attachments">{t('platform.tabs.attachments') ?? 'Attachments'}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <ActivityTimeline activities={lead.activities ?? []} />
                            </TabsContent>

                            <TabsContent value="notes" className="mt-4">
                                <NoteList subjectType="lead" subjectId={lead.id} notes={(lead as any).notes ?? []} />
                            </TabsContent>

                            <TabsContent value="attachments" className="mt-4">
                                <AttachmentList attachments={(lead as any).attachments ?? []} subjectType="lead" subjectId={lead.id} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
