import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import type { ReminderItem } from '@/types';
import { router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ReminderForm } from './reminder-form';

interface WorkspaceMember {
    id: number;
    name: string;
}

interface CurrentUser {
    id: number;
    name: string;
}

interface Props {
    reminders: ReminderItem[];
    remindableType: string;
    remindableId: string;
    members: WorkspaceMember[];
    currentUser: CurrentUser;
}

export function ReminderList({ reminders, remindableType, remindableId, members, currentUser }: Props) {
    const t = useTranslator();
    const [editTarget, setEditTarget] = useState<ReminderItem | null>(null);

    function handleDelete(id: string) {
        if (!confirm(t('reminder.form.delete_confirm'))) return;
        router.delete(route('reminders.destroy', id), { preserveScroll: true });
    }

    if (reminders.length === 0) {
        return <p className="text-muted-foreground py-4 text-center text-sm">{t('reminder.list.empty')}</p>;
    }

    return (
        <>
            <div className="divide-border divide-y">
                {reminders.map((reminder) => {
                    const isOwner = reminder.user_id === currentUser.id || reminder.user_id === currentUser.id;
                    const timeDisplay = reminder.is_notified
                        ? t('reminder.status.notified', {
                              time: formatDistanceToNow(new Date(reminder.notified_at ?? reminder.remind_at), { addSuffix: true }),
                          })
                        : formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true });

                    return (
                        <div key={reminder.id} className="flex items-start gap-3 py-3">
                            <div className="bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                                {reminder.is_notified ? (
                                    <BellOff className="text-muted-foreground h-3.5 w-3.5" />
                                ) : (
                                    <Bell className="h-3.5 w-3.5 text-amber-500" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-snug">{reminder.description}</p>
                                <p className="text-muted-foreground mt-0.5 text-xs">{timeDisplay}</p>
                            </div>

                            {isOwner && !reminder.is_notified && (
                                <div className="flex shrink-0 gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(reminder)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive h-7 w-7"
                                        onClick={() => handleDelete(reminder.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {editTarget && (
                <ReminderForm
                    open={true}
                    onClose={() => setEditTarget(null)}
                    remindableType={remindableType}
                    remindableId={remindableId}
                    members={members}
                    currentUser={currentUser}
                    reminder={editTarget}
                />
            )}
        </>
    );
}
