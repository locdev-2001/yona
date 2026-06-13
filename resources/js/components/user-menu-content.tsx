import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { useTranslator } from '@/lib/i18n';
import type { SharedData, User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Check, Languages, LogOut, Settings } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

const LOCALES = ['vi', 'en'] as const;

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const t = useTranslator();
    const { locale } = usePage<SharedData>().props;

    const setLocale = (next: string) => {
        if (next !== locale) {
            router.put(route('locale'), { locale: next }, { preserveScroll: true });
        }
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2" />
                        {t('platform.nav.settings')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Languages className="mr-2" />
                        {t('platform.locale.label')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {LOCALES.map((code) => (
                            <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
                                {t(`platform.locale.${code}`)}
                                {locale === code && <Check className="ml-auto size-4" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2" />
                    {t('platform.nav.logout')}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
