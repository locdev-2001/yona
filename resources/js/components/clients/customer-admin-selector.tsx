import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslator } from '@/lib/i18n';
import type { User } from '@/types';
import { ChevronDown, X } from 'lucide-react';

interface Props {
    users: Pick<User, 'id' | 'name'>[];
    selected: number[]; // user ids
    onChange: (ids: number[]) => void;
}

/**
 * Multi-select user picker for customer-admin delegation.
 * Only shows active workspace members (passed from controller).
 */
export default function CustomerAdminSelector({ users, selected, onChange }: Props) {
    const t = useTranslator();

    function toggle(id: number) {
        onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    }

    function remove(id: number) {
        onChange(selected.filter((s) => s !== id));
    }

    const selectedUsers = users.filter((u) => selected.includes(u.id as number));

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
                {selectedUsers.map((u) => (
                    <Badge key={u.id} variant="secondary" className="gap-1">
                        {u.name}
                        <button type="button" onClick={() => remove(u.id as number)} className="hover:text-destructive ml-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                {selectedUsers.length === 0 && <span className="text-muted-foreground text-sm">{t('clients.customer_admin.none') ?? 'None'}</span>}
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                        {t('clients.customer_admin.add') ?? 'Add Admin'}
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-2" align="start">
                    {users.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-1 text-sm">{t('clients.customer_admin.none')}</p>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="hover:bg-accent flex items-center gap-2 rounded px-2 py-1">
                                <Checkbox
                                    id={`admin-${user.id}`}
                                    checked={selected.includes(user.id as number)}
                                    onCheckedChange={() => toggle(user.id as number)}
                                />
                                <Label htmlFor={`admin-${user.id}`} className="cursor-pointer font-normal">
                                    {user.name}
                                </Label>
                            </div>
                        ))
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}
