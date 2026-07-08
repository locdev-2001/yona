import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslator } from '@/lib/i18n';
import type { ClientGroup } from '@/types';
import { ChevronDown, X } from 'lucide-react';

interface Props {
    groups: ClientGroup[];
    selected: string[]; // group ids
    onChange: (ids: string[]) => void;
}

/**
 * Multi-select group picker. Shows badges for selected groups.
 */
export default function GroupSelector({ groups, selected, onChange }: Props) {
    const t = useTranslator();

    function toggle(id: string) {
        onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    }

    function remove(id: string) {
        onChange(selected.filter((s) => s !== id));
    }

    const selectedGroups = groups.filter((g) => selected.includes(g.id));

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
                {selectedGroups.map((g) => (
                    <Badge key={g.id} variant="secondary" className="gap-1">
                        {g.name}
                        <button type="button" onClick={() => remove(g.id)} className="hover:text-destructive ml-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                        {t('clients.fields.groups') ?? 'Groups'}
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                    {groups.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-1 text-sm">{t('clients.group.title') ?? 'No groups'}</p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.id} className="hover:bg-accent flex items-center gap-2 rounded px-2 py-1">
                                <Checkbox id={`group-${group.id}`} checked={selected.includes(group.id)} onCheckedChange={() => toggle(group.id)} />
                                <Label htmlFor={`group-${group.id}`} className="cursor-pointer font-normal">
                                    {group.name}
                                </Label>
                            </div>
                        ))
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}
