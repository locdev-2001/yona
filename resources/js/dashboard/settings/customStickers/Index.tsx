import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import StickerLibraryManager, { PACK_QUERY_KEY } from './StickerLibraryManager';
import { InfoTip } from './stickerLibraryUi';
import { createStickerLibraryApi } from './stickerLibraryApi';
import type { DashboardPageProps } from '../../types';
import { currentQuery, replaceQuery } from '../../reports/helpers/urlQuery';
import type { StickerLibraryAccess } from './types';

export const PLATFORM_STICKER_LIBRARY_API_BASE = '/api/v1/platform_sticker_library';

type StickerLibraryTab = 'account' | 'platform';

export const TAB_QUERY_KEY = 'tab';
const DEFAULT_TAB: StickerLibraryTab = 'account';

interface CustomStickersPageProps extends DashboardPageProps {
    stickerLibraryAccess: StickerLibraryAccess;
}

function LockedNotice({ message }: { message: string }) {
    return (
        <div role="note" className="flex items-start gap-3 rounded-lg border border-n-weak bg-n-alpha-1 p-4">
            <span className="i-lucide-lock mt-0.5 size-4 shrink-0 text-n-slate-11" aria-hidden="true" />
            <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.LOCKED_TITLE')}</p>
                <p className="text-sm text-n-slate-11">{message}</p>
            </div>
        </div>
    );
}

// Cài đặt / Kho sticker: mở cho mọi quản trị viên. Kho riêng chỉ dùng được khi
// máy chủ báo có quyền (StickerLibraryAccess); kho nền tảng chỉ hiện với tài
// khoản có quyền hệ thống.
export default function CustomStickersIndex() {
    const { currentAccount, stickerLibraryAccess } = usePage<CustomStickersPageProps>().props;
    const accountId = currentAccount!.id;
    const accountApi = useMemo(() => createStickerLibraryApi(`/api/v1/accounts/${accountId}`), [accountId]);
    const platformApi = useMemo(() => createStickerLibraryApi(PLATFORM_STICKER_LIBRARY_API_BASE), []);

    const tabs = [
        { label: t('STICKER_LIBRARY.TABS.ACCOUNT'), value: 'account' },
        ...(stickerLibraryAccess.platformLibrary ? [{ label: t('STICKER_LIBRARY.TABS.PLATFORM'), value: 'platform' }] : []),
    ];
    const [activeTab, setActiveTab] = useState<StickerLibraryTab>(() => {
        const requested = currentQuery()[TAB_QUERY_KEY];
        return tabs.some(tab => tab.value === requested) ? (requested as StickerLibraryTab) : DEFAULT_TAB;
    });
    const changeTab = (tab: StickerLibraryTab) => {
        setActiveTab(tab);
        const { [TAB_QUERY_KEY]: _previousTab, [PACK_QUERY_KEY]: _previousPack, ...otherParams } = currentQuery();
        replaceQuery(tab === DEFAULT_TAB ? otherParams : { ...otherParams, [TAB_QUERY_KEY]: tab });
    };

    const manager = (api: typeof accountApi) => (
        <div className="min-h-0 flex-1">
            <StickerLibraryManager api={api} />
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
                            onTabChanged={tab => changeTab(tab.value as StickerLibraryTab)}
                        />
                    ) : null}
                    {activeTab === 'account' &&
                        (stickerLibraryAccess.accountLibrary ? manager(accountApi) : <LockedNotice message={t('STICKER_LIBRARY.LOCKED_ACCOUNT_LIBRARY')} />)}
                    {activeTab === 'platform' && stickerLibraryAccess.platformLibrary ? manager(platformApi) : null}
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
