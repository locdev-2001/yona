import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import type { Client, Lead } from '@/types';
import { useForm } from '@inertiajs/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

// sentinel: no existing client chosen (create new)
const CREATE_NEW = '__create_new__';

interface Props {
    lead: Lead;
    clients: Pick<Client, 'id' | 'name'>[];
}

export default function LeadConvertDialog({ lead, clients }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'new' | 'existing'>('new');

    const { data, setData, post, processing, errors, reset } = useForm({
        client_id: null as string | null,
        client_name: lead.company ?? lead.name,
        contact_name: lead.name,
    });

    function handleModeChange(value: string) {
        if (value === CREATE_NEW) {
            setMode('new');
            setData((prev) => ({ ...prev, client_id: null }));
        } else {
            setMode('existing');
            setData((prev) => ({ ...prev, client_id: value }));
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('leads.convert', lead.id), {
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    }

    // Don't show button if already converted
    if (lead.date_converted) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('leads.actions.convert')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('leads.convert.title')}</DialogTitle>
                    <DialogDescription>{t('leads.convert.description') ?? 'Convert this lead into a client record.'}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Existing client picker */}
                    {clients.length > 0 && (
                        <div className="space-y-1.5">
                            <Label>{t('leads.convert.attach_to') ?? 'Attach to'}</Label>
                            <Select value={mode === 'existing' ? (data.client_id ?? '') : CREATE_NEW} onValueChange={handleModeChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CREATE_NEW}>{t('leads.convert.create_new_client') ?? 'Create new client'}</SelectItem>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* New client name — only shown when creating */}
                    {mode === 'new' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="client_name">{t('leads.convert.client_name')}</Label>
                            <Input
                                id="client_name"
                                value={data.client_name}
                                onChange={(e) => setData('client_name', e.target.value)}
                                placeholder={t('leads.convert.client_name')}
                            />
                            {errors.client_name && <p className="text-destructive text-xs">{errors.client_name}</p>}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="contact_name">{t('leads.convert.contact_name')}</Label>
                        <Input
                            id="contact_name"
                            value={data.contact_name}
                            onChange={(e) => setData('contact_name', e.target.value)}
                            placeholder={t('leads.convert.contact_name')}
                        />
                        {errors.contact_name && <p className="text-destructive text-xs">{errors.contact_name}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('platform.actions.cancel') ?? 'Cancel'}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('leads.convert.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
