import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

const SUBJECT_TYPES = ['lead', 'contact', 'conversation'] as const;

interface Props {
    enrollRoute: string;
}

/** "Chạy thủ công" — WorkflowController::enroll() (POST subject_type + subject_id). */
export function EnrollDialog({ enrollRoute }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ subject_type: 'lead', subject_id: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(enrollRoute, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">
                    {t('automation.canvas.run_manually')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t('automation.enroll.title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>{t('automation.enroll.subject_type')}</Label>
                        <Select value={data.subject_type} onValueChange={(v) => setData('subject_type', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SUBJECT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t('automation.enroll.subject_id')}</Label>
                        <Input value={data.subject_id} onChange={(e) => setData('subject_id', e.target.value)} placeholder="uuid" />
                        {errors.subject_id && <p className="text-destructive text-xs">{errors.subject_id}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={processing}>
                            {t('automation.enroll.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
