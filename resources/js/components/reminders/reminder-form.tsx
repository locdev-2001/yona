import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { ReminderItem, User } from '@/types';
import { useForm } from '@inertiajs/react';

interface WorkspaceMember {
    id: number;
    name: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    remindableType: string;
    remindableId: string;
    members: WorkspaceMember[];
    currentUser: User;
    reminder?: ReminderItem | null;
}

export function ReminderForm({ open, onClose, remindableType, remindableId, members, currentUser, reminder }: Props) {
    const t = useTranslator();

    const isEdit = Boolean(reminder);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        remindable_type: remindableType,
        remindable_id: remindableId,
        user_id: reminder?.user_id ?? currentUser.id,
        description: reminder?.description ?? '',
        remind_at: reminder?.remind_at ? new Date(reminder.remind_at).toISOString().slice(0, 16) : '',
        lock_version: reminder?.lock_version ?? 0,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && reminder) {
            put(route('reminders.update', reminder.id), {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post(route('reminders.store'), {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('reminder.form.edit') : t('reminder.form.add')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reminder-description">{t('reminder.form.description')}</Label>
                        <Textarea
                            id="reminder-description"
                            rows={3}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reminder-remind-at">{t('reminder.form.remind_at')}</Label>
                        <Input
                            id="reminder-remind-at"
                            type="datetime-local"
                            value={data.remind_at}
                            onChange={(e) => setData('remind_at', e.target.value)}
                        />
                        <InputError message={errors.remind_at} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reminder-recipient">{t('reminder.form.recipient')}</Label>
                        <Select value={String(data.user_id)} onValueChange={(v) => setData('user_id', Number(v))}>
                            <SelectTrigger id="reminder-recipient">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.user_id} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            {t('reminder.form.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('reminder.form.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
