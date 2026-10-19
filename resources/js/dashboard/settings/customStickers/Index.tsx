import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import StickerLibraryManager, { PACK_QUERY_KEY } from './StickerLibraryManager';
import type { PackTransfer } from './StickerLibraryManager';
import { InfoTip } from './stickerLibraryUi';
import { accountStickerLibraryBase, createStickerLibraryApi, createStickerPackMoveApi } from './stickerLibraryApi';
import type { StickerLibraryApi, StickerLibraryKind } from './stickerLibraryApi';
import type { DashboardPageProps } from '../../types';
import { currentQuery, replaceQuery } from '../../reports/helpers/urlQuery';

export const PLATFORM_STICKER_LIBRARY_API_BASE = '/api/v1/platform_sticker_library';

export const TAB_QUERY_KEY = 'tab';
const DEFAULT_TAB: StickerLibraryKind = 'account';
const OTHER_LIBRARY: Record<StickerLibraryKind, StickerLibraryKind> = { account: 'platform', platform: 'account' };

// Cài đặt / Kho sticker: kho riêng mở cho mọi quản trị viên; kho nền tảng chỉ
// hiện khi máy chủ báo có quyền hệ thống (auth.user.can_manage_platform_stickers).
export default function CustomStickersIndex() {
    const { currentAccount, auth } = usePage<DashboardPageProps>().props;
    const canManagePlatformLibrary = Boolean(auth.user?.can_manage_platform_stickers);
    const accountId = currentAccount!.id;
    const accountApi = useMemo(() => createStickerLibraryApi(accountStickerLibraryBase(accountId)), [accountId]);
    const platformApi = useMemo(() => createStickerLibraryApi(PLATFORM_STICKER_LIBRARY_API_BASE), []);
    const moveApi = useMemo(() => createStickerPackMoveApi(accountId), [accountId]);

    const tabs = [
        { label: t('STICKER_LIBRARY.TABS.ACCOUNT'), value: 'account' },
        ...(canManagePlatformLibrary ? [{ label: t('STICKER_LIBRARY.TABS.PLATFORM'), value: 'platform' }] : []),
    ];
    const [activeTab, setActiveTab] = useState<StickerLibraryKind>(() => {
        const requested = currentQuery()[TAB_QUERY_KEY];
        return tabs.some(tab => tab.value === requested) ? (requested as StickerLibraryKind) : DEFAULT_TAB;
    });
    const changeTab = (tab: StickerLibraryKind, packId: number | null = null) => {
        const { [TAB_QUERY_KEY]: _previousTab, [PACK_QUERY_KEY]: _previousPack, ...otherParams } = currentQuery();
        replaceQuery({
            ...otherParams,
            ...(tab === DEFAULT_TAB ? {} : { [TAB_QUERY_KEY]: tab }),
            ...(packId === null ? {} : { [PACK_QUERY_KEY]: String(packId) }),
        });
        setActiveTab(tab);
    };

    // Kho còn lại chỉ mở được khi có quyền kho nền tảng (máy chủ còn đòi thêm vai trò quản trị viên account).
    const packTransferFrom = (library: StickerLibraryKind): PackTransfer | undefined => {
        if (!canManagePlatformLibrary) return undefined;
        const destination = OTHER_LIBRARY[library];

        return {
            destination,
            movePack: packId => moveApi.movePack(packId, destination),
            openDestination: packId => changeTab(destination, packId),
        };
    };

    const manager = (api: StickerLibraryApi, library: StickerLibraryKind) => (
        <div className="min-h-0 flex-1">
            <StickerLibraryManager key={library} api={api} packTransfer={packTransferFrom(library)} />
        </div>
    );

    return (
        <Dashboard>
            <SettingsWrapper wide>
                <div className="flex w-full flex-col gap-4 md:h-[calc(100dvh-3rem)]">
                    <BaseSettingsHeader
                        title={t('STICKER_LIBRARY.PAGE_HEADER')}
                        description={
                            <span className="inline-flex flex-wrap items-center gap-1">
                                {activeTab === 'platform' ? t('STICKER_LIBRARY.PLATFORM_DESCRIPTION') : t('STICKER_LIBRARY.PAGE_DESCRIPTION')}
                                <InfoTip label={t('STICKER_LIBRARY.INFO_LABEL')} text={t('STICKER_LIBRARY.PAGE_INFO')} />
                            </span>
                        }
                    />
                    {tabs.length >= 2 ? (
                        <TabBar
                            tabs={tabs}
                            initialActiveTab={tabs.findIndex(tab => tab.value === activeTab)}
                            onTabChanged={tab => changeTab(tab.value as StickerLibraryKind)}
                        />
                    ) : null}
                    {activeTab === 'account' ? manager(accountApi, 'account') : null}
                    {activeTab === 'platform' && canManagePlatformLibrary ? manager(platformApi, 'platform') : null}
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
