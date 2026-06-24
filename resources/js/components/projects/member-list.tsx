import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import type { Project, User } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    project: Project;
    workspaceMembers: Pick<User, 'id' | 'name'>[];
    canManage: boolean;
}

export default function MemberList({ project, workspaceMembers, canManage }: Props) {
    const t = useTranslator();
    const members = project.members ?? [];
    const [selectedUserId, setSelectedUserId] = useState('');

    const { post, processing } = useForm({ user_id: '' });

    function handleAdd() {
        if (!selectedUserId) return;
        router.post(route('projects.members.store', project.id), { user_id: parseInt(selectedUserId, 10) }, { preserveScroll: true });
        setSelectedUserId('');
    }

    function handleRemove(userId: number) {
        router.delete(route('projects.members.destroy', { project: project.id, userId }), { preserveScroll: true });
    }

    const nonMembers = workspaceMembers.filter((wm) => !members.some((m) => m.id === wm.id));

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="flex gap-2">
                    <select
                        className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        <option value="">— {t('projects.actions.add_member')} —</option>
                        {nonMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                    <Button size="sm" onClick={handleAdd} disabled={processing || !selectedUserId}>
                        <UserPlus className="mr-1 h-4 w-4" />
                        {t('projects.actions.add_member')}
                    </Button>
                </div>
            )}

            <ul className="divide-y rounded-md border">
                {members.length === 0 && <li className="text-muted-foreground px-4 py-3 text-sm">{t('projects.member.user')} —</li>}
                {members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium">{member.name}</span>
                        {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => handleRemove(member.id)}>
                                <UserMinus className="text-destructive h-4 w-4" />
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
