import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';

export function ImpersonationBanner() {
    const t = useTranslator();
    const { auth } = usePage<SharedData>().props;

    if (!auth.impersonating) {
        return null;
    }

    return (
        <div className="bg-muted/60 flex items-center justify-center gap-3 border-b px-4 py-2 text-sm">
            <ShieldAlert className="text-destructive size-4 shrink-0" />
            <span className="text-foreground">{t('platform.admin.impersonation.banner')}</span>
            <Button asChild size="sm" variant="outline" className="h-7">
                <Link href={route('admin.impersonate.stop')} method="post" as="button">
                    {t('platform.admin.impersonation.stop')}
                </Link>
            </Button>
        </div>
    );
}
