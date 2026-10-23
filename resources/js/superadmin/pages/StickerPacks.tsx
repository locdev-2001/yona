import { Link, router } from '@inertiajs/react';
import { ArrowLeftIcon, Building2Icon } from '@admin/components/icons';
import { useMemo, useState } from 'react';

import { buttonVariants } from '@admin/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import PageHeader from '@admin/views/pages/page-header';
import AccountPicker from '@admin/views/stickers/account-picker';
import AccountStickerLibrary, { accountStickersUrl } from '@admin/views/stickers/AccountStickerLibrary';
import StickerLibrary from '@admin/views/stickers/sticker-library';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';

import { t } from '../../i18n';

type AccountRef = { id: number; name: string; overviewUrl: string };

const PLATFORM_URL = '/admin/sticker-packs';

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.STICKERS.${key}`, params);

export { accountStickersUrl };

// Kho sticker chung của Yona, hoặc kho riêng của một account khi có `account`.
export default function StickerPacks({
    apiBaseUrl,
    account,
    platformUrl = PLATFORM_URL,
}: {
    apiBaseUrl: string;
    account?: AccountRef;
    platformUrl?: string;
}) {
    const platformApi = useMemo(() => createStickerLibraryApi(apiBaseUrl, 'sticker-packs'), [apiBaseUrl]);
    // Chưa chọn tài khoản mà bấm tab "Kho của tài khoản" thì hiện ô chọn tài khoản
    // trong tab đó; ở tab Kho chung ô chọn không có việc gì nên không hiện.
    const [choosingAccount, setChoosingAccount] = useState(false);
    const tab = account || choosingAccount ? 'account' : 'platform';
    const picker = (
        <AccountPicker
            className="sm:w-80"
            label={label('PICK_ACCOUNT')}
            placeholder={label('PICK_ACCOUNT')}
            emptyText={label('NO_ACCOUNTS')}
            current={account ? { id: account.id, name: account.name } : undefined}
            onSelect={accountId => router.visit(accountStickersUrl(accountId))}
        />
    );

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader
                className="mb-0 md:mb-0"
                title={account ? label('ACCOUNT_TITLE', { name: account.name }) : t('STICKER_LIBRARY.MENU')}
                description={account ? label('ACCOUNT_DESCRIPTION') : t('STICKER_LIBRARY.SUPER_ADMIN_DESCRIPTION')}
                actions={
                    account ? (
                        <Link href={account.overviewUrl} className={buttonVariants({ variant: 'outline' })}>
                            <ArrowLeftIcon />
                            {label('BACK_TO_ACCOUNT')}
                        </Link>
                    ) : undefined
                }
            />

            <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
                <Tabs
                    value={tab}
                    onValueChange={value => {
                        if (value === 'platform') {
                            if (account) router.visit(platformUrl);
                            else setChoosingAccount(false);
                        } else if (!account) {
                            setChoosingAccount(true);
                        }
                    }}
                >
                    <TabsList variant="line" className="h-11 md:h-9">
                        <TabsTrigger value="platform" className="h-full flex-none px-3">
                            {label('PLATFORM_TAB')}
                        </TabsTrigger>
                        <TabsTrigger value="account" className="h-full flex-none px-3">
                            {account ? account.name : label('ACCOUNT_TAB')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                {account ? <div className="pb-2">{picker}</div> : null}
            </div>

            {account ? (
                <AccountStickerLibrary accountId={account.id} apiBaseUrl={apiBaseUrl} platformUrl={platformUrl} />
            ) : choosingAccount ? (
                <div className="flex flex-col items-center gap-3 border px-4 py-16 text-center">
                    <Building2Icon className="text-muted-foreground size-8" aria-hidden="true" />
                    <p className="font-medium">{label('PICK_ACCOUNT_TITLE')}</p>
                    <p className="text-muted-foreground max-w-sm text-sm">{label('PICK_ACCOUNT_HINT')}</p>
                    {picker}
                </div>
            ) : (
                <StickerLibrary key={apiBaseUrl} api={platformApi} />
            )}
        </div>
    );
}
