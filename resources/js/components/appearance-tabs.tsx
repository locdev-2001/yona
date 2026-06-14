import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

const TABS: { value: Appearance; icon: LucideIcon }[] = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
];

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();
    const t = useTranslator();

    return (
        <div className={cn('bg-secondary inline-flex gap-1 rounded-lg p-1', className)} {...props}>
            {TABS.map(({ value, icon: Icon }) => (
                <button
                    key={value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex items-center rounded-md px-3.5 py-1.5 transition-colors',
                        appearance === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    <Icon className="-ml-1 h-4 w-4" />
                    <span className="ml-1.5 text-sm">{t(`platform.appearance.${value}`)}</span>
                </button>
            ))}
        </div>
    );
}
