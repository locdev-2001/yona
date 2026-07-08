import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { HTMLAttributes } from 'react';

const LOCALES = ['vi', 'en'] as const;

export default function LanguageTabs({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const t = useTranslator();
    const { locale } = usePage<SharedData>().props;

    const setLocale = (next: string) => {
        if (next !== locale) {
            router.put(route('locale'), { locale: next }, { preserveScroll: true });
        }
    };

    return (
        <div className={cn('bg-secondary inline-flex gap-1 rounded-lg p-1', className)} {...props}>
            {LOCALES.map((code) => (
                <button
                    key={code}
                    onClick={() => setLocale(code)}
                    className={cn(
                        'rounded-md px-3.5 py-1.5 text-sm transition-colors',
                        locale === code ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    {t(`platform.locale.${code}`)}
                </button>
            ))}
        </div>
    );
}
