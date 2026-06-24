import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import type { Lead } from '@/types';
import { useForm } from '@inertiajs/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Props {
    lead: Lead;
}

type ConvertFormData = {
    client_name: string;
    contact_name: string;
    [key: string]: unknown;
};

export default function LeadConvertDialog({ lead }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors } = useForm<ConvertFormData>({
        client_name: lead.company ?? lead.name,
        contact_name: lead.name,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('leads.convert', lead.id), {
            onSuccess: () => setOpen(false),
        });
    }

    // Don't show button if already converted
    if (lead.date_converted) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('leads.actions.convert')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('leads.convert.title')}</DialogTitle>
                    <DialogDescription>{t('leads.convert.description')}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
