import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, ClientGroup } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    groups: (ClientGroup & { clients_count: number })[];
}

interface GroupFormData {
    name: string;
    slug: string;
    [key: string]: unknown;
}

export default function ClientGroups({ groups }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ClientGroup | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('clients.title.index') ?? 'Clients', href: route('clients.index') },
        { title: t('clients.title.groups') ?? 'Groups', href: route('client-groups.index') },
    ];

    const { data, setData, post, put, processing, errors, reset } = useForm<GroupFormData>({
        name: '',
        slug: '',
    });

    function openAdd() {
        reset();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(group: ClientGroup) {
        setData({ name: group.name, slug: group.slug });
        setEditing(group);
        setOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(route('client-groups.update', { client_group: editing.id }), { onSuccess: () => setOpen(false) });
        } else {
            post(route('client-groups.store'), { onSuccess: () => setOpen(false) });
        }
    }

    function handleDelete(group: ClientGroup) {
        if (!confirm(t('clients.group.delete_confirm') ?? 'Delete this group?')) return;
        router.delete(route('client-groups.destroy', { client_group: group.id }));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('clients.title.groups') ?? 'Client Groups'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader title={t('clients.title.groups') ?? 'Client Groups'} />
                    <Button size="sm" onClick={openAdd}>
                        <Plus className="mr-1 h-4 w-4" />
                        {t('clients.group.add') ?? 'Add Group'}
                    </Button>
                </div>

                {groups.length === 0 ? (
                    <p className="text-muted-foreground py-16 text-center text-sm">{t('clients.empty') ?? 'No groups yet.'}</p>
                ) : (
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b text-left">
                                    <th className="px-4 py-3 font-medium">{t('clients.group.name')}</th>
                                    <th className="px-4 py-3 font-medium">{t('clients.group.slug')}</th>
                                    <th className="px-4 py-3 font-medium">#</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <tr key={group.id} className="hover:bg-muted/20 border-b last:border-0">
                                        <td className="px-4 py-3 font-medium">{group.name}</td>
                                        <td className="text-muted-foreground px-4 py-3">{group.slug}</td>
                                        <td className="text-muted-foreground px-4 py-3">{group.clients_count}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(group)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive h-7 w-7"
                                                    onClick={() => handleDelete(group)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? t('clients.group.edit') : t('clients.group.add')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <Label htmlFor="group_name">{t('clients.group.name')} *</Label>
                            <Input id="group_name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                            {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="group_slug">{t('clients.group.slug')}</Label>
                            <Input id="group_slug" value={data.slug} onChange={(e) => setData('slug', e.target.value)} placeholder="auto" />
                            {errors.slug && <p className="text-destructive mt-1 text-xs">{errors.slug}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                {t('clients.actions.cancel')}
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {t('clients.actions.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
