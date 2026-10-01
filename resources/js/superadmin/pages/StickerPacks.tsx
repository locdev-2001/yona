import { Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { t } from '../../i18n';
import { getJson, postJson } from 'dashboard/helper/apiClient';
import StickerLibraryManager from 'dashboard/settings/customStickers/StickerLibraryManager';
import type { PackTransfer } from 'dashboard/settings/customStickers/StickerLibraryManager';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';
import type { LibraryStickerPackDetail } from 'dashboard/settings/customStickers/types';
import { buttonClassName } from '../ui/Button';
import { cn } from '../ui/cn';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';

type AccountRef = { id: number; name: string; overviewUrl: string };

type SearchResult = { type: string; id: number; title: string; subtitle: string | null; url: string };

const PLATFORM_URL = '/admin/sticker_packs';
const SEARCH_URL = '/admin/api/search';
const SEARCH_DELAY_MS = 250;
const MIN_QUERY_LENGTH = 2;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.STICKERS.${key}`, params);

export const accountStickersUrl = (accountId: number) => `/admin/accounts/${accountId}/sticker_packs`;

// Ô chọn account: gọi API tìm nhanh của console, chỉ giữ kết quả loại account.
function AccountPicker({ currentId }: { currentId?: number }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const requestRef = useRef(0);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_QUERY_LENGTH && !/^\d+$/.test(trimmed)) {
            setResults(null);
            return;
        }
        const request = ++requestRef.current;
        const timer = setTimeout(async () => {
            try {
                const response = await getJson<{ data: SearchResult[] }>(`${SEARCH_URL}?q=${encodeURIComponent(trimmed)}`);
                if (request === requestRef.current) setResults(response.data.filter(result => result.type === 'account'));
            } catch {
                if (request === requestRef.current) setResults([]);
            }
        }, SEARCH_DELAY_MS);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full sm:w-80">
            <Input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={label('PICK_ACCOUNT')}
                aria-label={label('PICK_ACCOUNT')}
            />
            {results !== null ? (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-console-border bg-console-card p-1 text-sm shadow-lg">
                    {results.length === 0 ? (
                        <li className="px-3 py-2 text-console-muted-foreground">{label('NO_ACCOUNTS')}</li>
                    ) : (
                        results.map(result => (
                            <li key={result.id}>
                                <Link
                                    href={accountStickersUrl(result.id)}
                                    className={cn(
                                        'flex flex-col rounded px-3 py-2 hover:bg-console-accent',
                                        result.id === currentId && 'bg-console-accent',
                                    )}
                                >
                                    <span className="font-medium">{result.title}</span>
                                    {result.subtitle ? <span className="text-xs text-console-muted-foreground">{result.subtitle}</span> : null}
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}

// Kho sticker chung của Yona, hoặc kho riêng của một account khi có `account`:
// cùng màn quản trị (StickerLibraryManager) với Cài đặt của tenant, chỉ khác gốc API.
export default function StickerPacks({
    apiBaseUrl,
    account,
    platformUrl = PLATFORM_URL,
}: {
    apiBaseUrl: string;
    account?: AccountRef;
    platformUrl?: string;
}) {
    const api = useMemo(() => createStickerLibraryApi(apiBaseUrl), [apiBaseUrl]);
    const packTransfer = useMemo<PackTransfer | undefined>(
        () =>
            account
                ? {
                      destination: 'platform',
                      movePack: (packId: number) =>
                          postJson<LibraryStickerPackDetail>(`${apiBaseUrl}/sticker_packs/${packId}/move`, { library: 'platform' }),
                      openDestination: () => router.visit(platformUrl),
                  }
                : undefined,
        [account, apiBaseUrl, platformUrl],
    );

    return (
        <div className="flex flex-col gap-4">
            <PageHeader
                title={account ? label('ACCOUNT_TITLE', { name: account.name }) : t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')}
                description={account ? label('ACCOUNT_DESCRIPTION') : t('STICKER_LIBRARY.SUPER_ADMIN_DESCRIPTION')}
                actions={
                    account ? (
                        <Link href={account.overviewUrl} className={buttonClassName({ variant: 'outline' })}>
                            <Icon name="i-lucide-arrow-left" />
                            {label('BACK_TO_ACCOUNT')}
                        </Link>
                    ) : undefined
                }
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <nav className="inline-flex w-fit rounded-md border border-console-border bg-console-card p-0.5 shadow-sm">
                    <Link
                        href={platformUrl}
                        aria-current={account ? undefined : 'page'}
                        className={cn(
                            'h-8 rounded px-3 text-sm font-medium leading-8',
                            account ? 'text-console-muted-foreground hover:text-console-foreground' : 'bg-console-primary text-console-primary-foreground',
                        )}
                    >
                        {label('PLATFORM_TAB')}
                    </Link>
                    <span
                        aria-current={account ? 'page' : undefined}
                        className={cn(
                            'h-8 rounded px-3 text-sm font-medium leading-8',
                            account ? 'bg-console-primary text-console-primary-foreground' : 'text-console-muted-foreground',
                        )}
                    >
                        {account ? account.name : label('ACCOUNT_TAB')}
                    </span>
                </nav>
                <AccountPicker currentId={account?.id} />
            </div>
            <div className="min-h-0 md:h-[calc(100dvh-14rem)]">
                <StickerLibraryManager key={apiBaseUrl} api={api} packTransfer={packTransfer} />
            </div>
        </div>
    );
}
