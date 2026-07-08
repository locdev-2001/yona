import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    /** Route to POST the new lookup to (its store endpoint, which redirects back). */
    storeRoute: string;
    /** Label on the small "+" trigger button shown next to the picker. */
    triggerLabel: string;
    /** Title of the create dialog. */
    dialogTitle: string;
    /** Placeholder for the name input. */
    placeholder?: string;
    /** Called with the created name once the POST succeeds, so the host form can auto-select it. */
    onCreated: (name: string) => void;
}

/**
 * Inline quick-create for a name-only lookup (client group, lead source, ...).
 *
 * Opens a small dialog, POSTs `{ name }` to `storeRoute` (which redirects back),
 * preserving the host form's state so nothing entered is lost, then hands the
 * created name back to the parent. The dialog content is portaled, so this is
 * safe to render inside another <form>.
 */
export default function QuickCreateLookup({ storeRoute, triggerLabel, dialogTitle, placeholder, onCreated }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        router.post(
            storeRoute,
            { name: trimmed },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    onCreated(trimmed);
                    setName('');
                    setOpen(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1">
                    <Plus className="h-3 w-3" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{t('platform.quick_create.subtitle') ?? 'Create without leaving this form.'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="quick-create-name">{t('platform.quick_create.name') ?? 'Name'}</Label>
                        <Input id="quick-create-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} autoFocus />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('platform.quick_create.cancel') ?? 'Cancel'}
                        </Button>
                        <Button type="submit" disabled={saving || !name.trim()}>
                            {t('platform.quick_create.save') ?? 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
