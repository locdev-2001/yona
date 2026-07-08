import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

const OPTIONS: { value: Appearance; icon: LucideIcon }[] = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'system', icon: Monitor },
];

// Compact single-icon theme switcher: the trigger shows the active mode, the menu lets you pick.
// Use where a full segmented control (appearance-tabs.tsx) would be too bulky, e.g. a tight nav bar.
export default function AppearanceToggleDropdown({ className }: { className?: string }) {
    const { appearance, updateAppearance } = useAppearance();
    const t = useTranslator();
    const ActiveIcon = (OPTIONS.find((option) => option.value === appearance) ?? OPTIONS[2]).icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn('size-9 rounded-full', className)} aria-label={t('platform.nav.appearance')}>
                    <ActiveIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
                {OPTIONS.map(({ value, icon: Icon }) => (
                    <DropdownMenuItem key={value} onClick={() => updateAppearance(value)} className="gap-2">
                        <Icon className="size-4" />
                        <span className="flex-1">{t(`platform.appearance.${value}`)}</span>
                        {appearance === value && <Check className="size-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
