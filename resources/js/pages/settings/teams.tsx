import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { TeamNode, type TeamNodeData } from '@/components/settings/team-node';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

interface TeamData {
    id: string;
    name: string;
    parent_id: string | null;
    member_count: number;
}

type FormDialog = { mode: 'create' | 'rename' | 'reparent'; team?: TeamNodeData; parentId?: string | null };

function buildTree(teams: TeamData[]): TeamNodeData[] {
    const byParent = new Map<string | null, TeamNodeData[]>();
    teams.forEach((team) => {
        const bucket = byParent.get(team.parent_id) ?? [];
        bucket.push({ ...team, children: [] });
        byParent.set(team.parent_id, bucket);
    });
    const attach = (parentId: string | null): TeamNodeData[] =>
        (byParent.get(parentId) ?? []).map((node) => ({ ...node, children: attach(node.id) }));
    return attach(null);
}

export default function TeamsSettings({ teams }: { teams: TeamData[] }) {
    const t = useTranslator();
    const tree = useMemo(() => buildTree(teams), [teams]);

    const [dialog, setDialog] = useState<FormDialog | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TeamNodeData | null>(null);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [error, setError] = useState<string | undefined>();

    const openCreate = (parent: string | null = null) => {
        setDialog({ mode: 'create', parentId: parent });
        setName('');
        setError(undefined);
    };
    const openRename = (node: TeamNodeData) => {
        setDialog({ mode: 'rename', team: node });
        setName(node.name);
        setError(undefined);
    };
    const openMove = (node: TeamNodeData) => {
        setDialog({ mode: 'reparent', team: node });
        setParentId(node.parent_id);
        setError(undefined);
    };

    const submit = () => {
        const opts = {
            preserveScroll: true,
            onSuccess: () => setDialog(null),
            onError: (errors: Record<string, string>) => setError(Object.values(errors)[0]),
        };
        if (dialog?.mode === 'create') {
            router.post(route('teams.store'), { name, parent_id: dialog.parentId ?? null }, opts);
        } else if (dialog?.mode === 'rename' && dialog.team) {
            router.patch(route('teams.update', dialog.team.id), { name }, opts);
        } else if (dialog?.mode === 'reparent' && dialog.team) {
            router.patch(route('teams.reparent', dialog.team.id), { parent_id: parentId }, opts);
        }
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            router.delete(route('teams.destroy', deleteTarget.id), { preserveScroll: true, onSuccess: () => setDeleteTarget(null) });
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.teams.title'), href: '/settings/teams' }];
    const dialogTitle =
        dialog?.mode === 'rename' ? t('platform.actions.rename') : dialog?.mode === 'reparent' ? t('platform.actions.move') : t('platform.teams.add');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.teams.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <HeadingSmall title={t('platform.teams.title')} description={t('platform.teams.subtitle')} />
                        <Button size="sm" onClick={() => openCreate(null)}>
                            <Plus className="mr-2 size-4" />
                            {t('platform.teams.add')}
                        </Button>
                    </div>

                    <div className="rounded-xl border p-1">
                        {tree.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-sm">{t('platform.teams.empty')}</p>
                        ) : (
                            tree.map((node) => (
                                <TeamNode
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    onAddChild={openCreate}
                                    onRename={openRename}
                                    onMove={openMove}
                                    onDelete={setDeleteTarget}
                                />
                            ))
                        )}
                    </div>
                </div>

                <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{dialogTitle}</DialogTitle>
                        </DialogHeader>
                        {dialog?.mode === 'reparent' ? (
                            <div className="grid gap-2">
                                <Label>{t('platform.teams.parent')}</Label>
                                <Select value={parentId ?? 'root'} onValueChange={(value) => setParentId(value === 'root' ? null : value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="root">{t('platform.teams.no_parent')}</SelectItem>
                                        {teams
                                            .filter((team) => team.id !== dialog?.team?.id)
                                            .map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="team-name">{t('platform.teams.name')}</Label>
                                <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                            </div>
                        )}
                        <InputError message={error} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialog(null)}>
                                {t('platform.actions.cancel')}
                            </Button>
                            <Button onClick={submit}>{t('platform.actions.save')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('platform.actions.delete')}</DialogTitle>
                            <DialogDescription>{t('platform.teams.delete_confirm')}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                {t('platform.actions.cancel')}
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                {t('platform.actions.delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    );
}
