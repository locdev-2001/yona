import ContactManager from '@/components/clients/contact-manager';
import CustomerAdminSelector from '@/components/clients/customer-admin-selector';
import VaultList from '@/components/clients/vault-list';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, ClientGroup, ClientVaultEntry, User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ActivityTimeline } from '@modules/shared/resources/js/components/activity/activity-timeline';
import type { Attachment } from '@modules/shared/resources/js/components/attachments/attachment-list';
import { AttachmentList } from '@modules/shared/resources/js/components/attachments/attachment-list';
import type { CustomFieldDefinition } from '@modules/shared/resources/js/components/custom-fields/types';
import type { Note } from '@modules/shared/resources/js/components/notes/note-list';
import { NoteList } from '@modules/shared/resources/js/components/notes/note-list';
import TagInput from '@modules/shared/resources/js/components/tags/tag-input';
import { Globe, Pencil, Phone, Trash2 } from 'lucide-react';

interface Props {
    client: Client;
    clientFieldDefs: CustomFieldDefinition[];
    contactFieldDefs: CustomFieldDefinition[];
    availableGroups: ClientGroup[];
    availableAdmins: Pick<User, 'id' | 'name'>[];
    vaultEntries?: ClientVaultEntry[];
    attachments?: Attachment[];
    notes?: Note[];
    canEdit?: boolean;
    canDelete?: boolean;
}

export default function ClientShow({
    client,
    clientFieldDefs,
    contactFieldDefs,
    availableGroups,
    availableAdmins,
    vaultEntries = [],
    attachments = [],
    notes = [],
    canEdit = false,
    canDelete = false,
}: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('clients.title.index') ?? 'Clients', href: route('clients.index') },
        { title: client.name, href: route('clients.show', { client: client.id }) },
    ];

    function handleDelete() {
        if (!confirm(t('clients.actions.delete_confirm') ?? 'Delete this client?')) return;
        router.delete(route('clients.destroy', { client: client.id }));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <PageHeader title={client.name} />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            {client.phone && (
                                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                                    <Phone className="h-3.5 w-3.5" />
                                    {client.phone}
                                </span>
                            )}
                            {client.website && (
                                <a
                                    href={client.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
                                >
                                    <Globe className="h-3.5 w-3.5" />
                                    {client.website}
                                </a>
                            )}
                            {(client.groups ?? []).map((g) => (
                                <Badge key={g.id} variant="secondary" className="text-xs">
                                    {g.name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {canEdit && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('clients.edit', { client: client.id })}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    {t('clients.actions.edit')}
                                </Link>
                            </Button>
                        )}
                        {canDelete && (
                            <Button variant="destructive" size="sm" onClick={handleDelete}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {t('clients.actions.delete')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tags */}
                <TagInput tags={client.tags ?? []} attachableType="client" attachableId={client.id} />

                {/* Tabs */}
                <Tabs defaultValue="profile">
                    <TabsList>
                        <TabsTrigger value="profile">{t('clients.tabs.profile')}</TabsTrigger>
                        <TabsTrigger value="contacts">{t('clients.tabs.contacts')}</TabsTrigger>
                        <TabsTrigger value="files">{t('clients.tabs.files')}</TabsTrigger>
                        <TabsTrigger value="notes">{t('clients.tabs.notes')}</TabsTrigger>
                        <TabsTrigger value="activity">{t('clients.tabs.activity')}</TabsTrigger>
                        <TabsTrigger value="vault">{t('clients.tabs.vault')}</TabsTrigger>
                    </TabsList>

                    {/* Profile tab */}
                    <TabsContent value="profile" className="mt-4 space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {client.vat && (
                                <div>
                                    <p className="text-muted-foreground text-xs">{t('clients.fields.vat')}</p>
                                    <p className="text-sm font-medium">{client.vat}</p>
                                </div>
                            )}
                            {client.currency && (
                                <div>
                                    <p className="text-muted-foreground text-xs">{t('clients.fields.currency')}</p>
                                    <p className="text-sm font-medium">{client.currency}</p>
                                </div>
                            )}
                            {client.default_language && (
                                <div>
                                    <p className="text-muted-foreground text-xs">{t('clients.fields.default_language')}</p>
                                    <p className="text-sm font-medium">{client.default_language === 'vi' ? 'Tiếng Việt' : 'English'}</p>
                                </div>
                            )}
                            {client.owner && (
                                <div>
                                    <p className="text-muted-foreground text-xs">{t('clients.fields.owner')}</p>
                                    <p className="text-sm font-medium">{client.owner.name}</p>
                                </div>
                            )}
                        </div>

                        {/* Custom fields */}
                        {clientFieldDefs.length > 0 && client.custom_fields && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {clientFieldDefs.map((def) => {
                                    const value = client.custom_fields[def.slug];
                                    if (value === undefined || value === null || value === '') return null;
                                    return (
                                        <div key={def.id}>
                                            <p className="text-muted-foreground text-xs">{def.name}</p>
                                            <p className="text-sm">{String(value)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Customer admins */}
                        {canEdit && (
                            <div>
                                <p className="mb-2 text-sm font-medium">{t('clients.customer_admin.title')}</p>
                                <CustomerAdminSelector
                                    users={availableAdmins}
                                    selected={(client.customer_admins ?? []).map((u) => u.id as number)}
                                    onChange={(ids) => {
                                        router.post(
                                            route('clients.customer-admins.sync', { client: client.id }),
                                            { user_ids: ids },
                                            { preserveScroll: true },
                                        );
                                    }}
                                />
                            </div>
                        )}
                    </TabsContent>

                    {/* Contacts tab */}
                    <TabsContent value="contacts" className="mt-4">
                        <ContactManager clientId={client.id} contacts={client.contacts ?? []} contactFieldDefs={contactFieldDefs} canEdit={canEdit} />
                    </TabsContent>

                    {/* Files tab */}
                    <TabsContent value="files" className="mt-4">
                        <AttachmentList attachments={attachments} canDelete={canEdit} />
                    </TabsContent>

                    {/* Notes tab */}
                    <TabsContent value="notes" className="mt-4">
                        <NoteList noteableType="client" noteableId={client.id} notes={notes} canManage={canEdit} />
                    </TabsContent>

                    {/* Activity tab */}
                    <TabsContent value="activity" className="mt-4">
                        <ActivityTimeline activities={client.activities ?? []} />
                    </TabsContent>

                    {/* Vault tab */}
                    <TabsContent value="vault" className="mt-4">
                        <VaultList clientId={client.id} entries={vaultEntries} canEdit={canEdit} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
