import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    team_id: string | null;
    team_name: string | null;
    status: string;
    is_self: boolean;
}
interface TeamOption {
    id: string;
    name: string;
}

const NO_TEAM = 'none';

export default function MembersSettings({ members, teams, roles }: { members: Member[]; teams: TeamOption[]; roles: string[] }) {
    const t = useTranslator();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [deactivating, setDeactivating] = useState<Member | null>(null);
    const [form, setForm] = useState({ email: '', role: roles[0], team_id: NO_TEAM });
    const [error, setError] = useState<string | undefined>();

    const teamValue = (id: string | null) => id ?? NO_TEAM;
    const toTeamId = (value: string) => (value === NO_TEAM ? null : value);

    const submitInvite = () => {
        router.post(
            route('members.store'),
            { email: form.email, role: form.role, team_id: toTeamId(form.team_id) },
            { preserveScroll: true, onSuccess: () => setInviteOpen(false), onError: (e) => setError(Object.values(e)[0]) },
        );
    };

    const submitEdit = () => {
        if (!editing) return;
        router.patch(
            route('members.update', editing.id),
            { role: editing.role, team_id: toTeamId(editing.team_id ?? NO_TEAM) },
            { preserveScroll: true, onSuccess: () => setEditing(null), onError: (e) => setError(Object.values(e)[0]) },
        );
    };

    const confirmDeactivate = () => {
        if (deactivating) {
            router.delete(route('members.destroy', deactivating.id), { preserveScroll: true, onSuccess: () => setDeactivating(null) });
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.members.title'), href: '/settings/members' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.members.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <HeadingSmall title={t('platform.members.title')} description={t('platform.members.subtitle')} />
                        <Button
                            size="sm"
                            onClick={() => {
                                setForm({ email: '', role: roles[0], team_id: NO_TEAM });
                                setError(undefined);
                                setInviteOpen(true);
                            }}
                        >
                            <UserPlus className="mr-2 size-4" />
                            {t('platform.members.invite')}
                        </Button>
                    </div>

                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('platform.members.email')}</TableHead>
                                    <TableHead>{t('platform.members.role')}</TableHead>
                                    <TableHead>{t('platform.members.team')}</TableHead>
                                    <TableHead>{t('platform.members.status')}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="font-medium">{member.name}</div>
                                            <div className="text-muted-foreground text-xs">{member.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t(`platform.roles.${member.role}`)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{member.team_name ?? t('platform.members.no_team')}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.status === 'active' ? 'default' : 'outline'}>
                                                {t(`platform.statuses.${member.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {!member.is_self && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-7">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditing(member);
                                                                setError(undefined);
                                                            }}
                                                        >
                                                            {t('platform.actions.edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeactivating(member)}
                                                        >
                                                            {t('platform.members.deactivate')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('platform.members.invite')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="invite-email">{t('platform.members.email')}</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <RoleSelect
                                label={t('platform.members.role')}
                                value={form.role}
                                roles={roles}
                                onChange={(role) => setForm({ ...form, role })}
                                t={t}
                            />
                            <TeamSelect
                                label={t('platform.members.team')}
                                value={form.team_id}
                                teams={teams}
                                onChange={(team_id) => setForm({ ...form, team_id })}
                                t={t}
                            />
                            <InputError message={error} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setInviteOpen(false)}>
                                {t('platform.actions.cancel')}
                            </Button>
                            <Button onClick={submitInvite}>{t('platform.actions.invite')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing?.name}</DialogTitle>
                        </DialogHeader>
                        {editing && (
                            <div className="grid gap-4">
                                <RoleSelect
                                    label={t('platform.members.role')}
                                    value={editing.role}
                                    roles={roles}
                                    onChange={(role) => setEditing({ ...editing, role })}
                                    t={t}
                                />
                                <TeamSelect
                                    label={t('platform.members.team')}
                                    value={teamValue(editing.team_id)}
                                    teams={teams}
                                    onChange={(team_id) => setEditing({ ...editing, team_id: toTeamId(team_id) })}
                                    t={t}
                                />
                                <InputError message={error} />
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)}>
                                {t('platform.actions.cancel')}
                            </Button>
                            <Button onClick={submitEdit}>{t('platform.actions.save')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={deactivating !== null} onOpenChange={(open) => !open && setDeactivating(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('platform.members.deactivate')}</DialogTitle>
                            <DialogDescription>{t('platform.members.deactivate_confirm')}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeactivating(null)}>
                                {t('platform.actions.cancel')}
                            </Button>
                            <Button variant="destructive" onClick={confirmDeactivate}>
                                {t('platform.members.deactivate')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    );
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function RoleSelect({
    label,
    value,
    roles,
    onChange,
    t,
}: {
    label: string;
    value: string;
    roles: string[];
    onChange: (v: string) => void;
    t: Translate;
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                            {t(`platform.roles.${role}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function TeamSelect({
    label,
    value,
    teams,
    onChange,
    t,
}: {
    label: string;
    value: string;
    teams: TeamOption[];
    onChange: (v: string) => void;
    t: Translate;
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NO_TEAM}>{t('platform.members.no_team')}</SelectItem>
                    {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                            {team.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
