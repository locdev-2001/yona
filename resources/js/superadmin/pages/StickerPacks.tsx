import { Link, router } from '@inertiajs/react';
import { ArrowLeftIcon } from 'lucide-react';
import { useMemo } from 'react';

import { buttonVariants } from '@admin/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import PageHeader from '@admin/views/pages/page-header';
import AccountPicker from '@admin/views/stickers/account-picker';
import AccountStickerLibrary, { accountStickersUrl } from '@admin/views/stickers/AccountStickerLibrary';
import StickerLibrary from '@admin/views/stickers/sticker-library';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';

import { t } from '../../i18n';

type AccountRef = { id: number; name: string; overviewUrl: string };

const PLATFORM_URL = '/admin/sticker_packs';

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
    const platformApi = useMemo(() => createStickerLibraryApi(apiBaseUrl), [apiBaseUrl]);
    const tab = account ? 'account' : 'platform';

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                className="mb-0 md:mb-0"
                title={account ? label('ACCOUNT_TITLE', { name: account.name }) : t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                    value={tab}
                    onValueChange={value => {
                        if (value === 'platform' && account) router.visit(platformUrl);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="platform">{label('PLATFORM_TAB')}</TabsTrigger>
                        <TabsTrigger value="account" disabled={!account}>
                            {account ? account.name : label('ACCOUNT_TAB')}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <AccountPicker
                    className="sm:w-80"
                    label={label('PICK_ACCOUNT')}
                    placeholder={label('PICK_ACCOUNT')}
                    emptyText={label('NO_ACCOUNTS')}
                    current={account ? { id: account.id, name: account.name } : undefined}
                    onSelect={accountId => router.visit(accountStickersUrl(accountId))}
                />
            </div>

            {account ? (
                <AccountStickerLibrary accountId={account.id} apiBaseUrl={apiBaseUrl} platformUrl={platformUrl} />
            ) : (
                <StickerLibrary key={apiBaseUrl} api={platformApi} />
            )}
        </div>
    );
}
