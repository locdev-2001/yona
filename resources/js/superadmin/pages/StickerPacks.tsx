import { Link, router } from '@inertiajs/react';
import { ArrowLeftIcon } from '@admin/components/icons';
import { useMemo } from 'react';

import { buttonVariants } from '@admin/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import PageHeader from '@admin/views/pages/page-header';
import AccountLibraryList from '@admin/views/stickers/account-library-list';
import type { AccountLibraryPage } from '@admin/views/stickers/account-library-list';
import AccountPicker from '@admin/views/stickers/account-picker';
import AccountStickerLibrary, { accountStickersUrl } from '@admin/views/stickers/AccountStickerLibrary';
import StickerLibrary from '@admin/views/stickers/sticker-library';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';

import { t } from '../../i18n';

type AccountRef = { id: number; name: string; overviewUrl: string };

const PLATFORM_URL = '/admin/sticker-packs';
// Khớp StickerPacksController::ACCOUNTS_TAB.
const ACCOUNTS_TAB = 'accounts';

const accountLibrariesUrl = (platformUrl: string, { search, page }: { search?: string; page?: number }) => {
    const query = new URLSearchParams({ tab: ACCOUNTS_TAB });
    if (search) query.set('q', search);
    if (page && page > 1) query.set('page', String(page));

    return `${platformUrl}?${query.toString()}`;
};

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.STICKERS.${key}`, params);

export { accountStickersUrl };

// Kho sticker chung của Yona, hoặc kho riêng của một account khi có `account`.
export default function StickerPacks({
    apiBaseUrl,
    account,
    platformUrl = PLATFORM_URL,
    accountLibraries = null,
    accountLibrariesSearch = '',
}: {
    apiBaseUrl: string;
    account?: AccountRef;
    platformUrl?: string;
    // Có khi mở tab "Kho của tài khoản" mà chưa chọn tài khoản: danh sách tài khoản có kho riêng.
    accountLibraries?: AccountLibraryPage | null;
    accountLibrariesSearch?: string;
}) {
    const platformApi = useMemo(() => createStickerLibraryApi(apiBaseUrl, 'sticker-packs'), [apiBaseUrl]);
    const listUrl = (params: { search?: string; page?: number }) => accountLibrariesUrl(platformUrl, params);
    const tab = account || accountLibraries ? 'account' : 'platform';
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
                        if (value === 'platform') router.visit(platformUrl);
                        else if (!account) router.visit(listUrl({}));
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
            ) : accountLibraries ? (
                <AccountLibraryList libraries={accountLibraries} search={accountLibrariesSearch} listUrl={listUrl} label={label} />
            ) : (
                <StickerLibrary key={apiBaseUrl} api={platformApi} />
            )}
        </div>
    );
}
