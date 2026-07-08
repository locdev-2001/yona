import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslator } from '@/lib/i18n';
import type { Lead, User } from '@/types';
import { useForm } from '@inertiajs/react';
import { Loader2, UserCheck } from 'lucide-react';
import { useState } from 'react';

interface Props {
    lead: Lead;
    members: Pick<User, 'id' | 'name'>[];
}

type AssignFormData = {
    assigned_to: string;
};

export default function LeadAssignPopover({ lead, members }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing } = useForm<AssignFormData>({
        assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
    });

    function handleAssign(userId: string) {
        setData('assigned_to', userId);
        post(route('leads.assign', lead.id), {
            onSuccess: () => setOpen(false),
        });
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    <UserCheck className="mr-2 h-4 w-4" />
                    {t('leads.actions.assign')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
                <div className="space-y-1">
                    <button
                        type="button"
                        className="hover:bg-accent w-full rounded px-2 py-1.5 text-left text-sm"
                        onClick={() => handleAssign('')}
                        disabled={processing}
                    >
                        — {t('leads.fields.assigned_to')}
                    </button>
                    {members.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
                            onClick={() => handleAssign(String(m.id))}
                            disabled={processing}
                        >
                            {processing && data.assigned_to === String(m.id) && <Loader2 className="h-3 w-3 animate-spin" />}
                            {m.name}
                            {lead.assigned_to === m.id && <span className="text-primary ml-auto text-xs">✓</span>}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
