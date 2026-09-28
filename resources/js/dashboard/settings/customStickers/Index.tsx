import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import StickerLibraryManager from './StickerLibraryManager';
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
        const { [TAB_QUERY_KEY]: _previousTab, ...otherParams } = currentQuery();
        replaceQuery(tab === DEFAULT_TAB ? otherParams : { ...otherParams, [TAB_QUERY_KEY]: tab });
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="flex w-full flex-col gap-6 px-6 py-8">
                    <BaseSettingsHeader title={t('STICKER_LIBRARY.PAGE_HEADER')} description={t('STICKER_LIBRARY.PAGE_DESCRIPTION')} />
                    <TabBar
                        tabs={tabs}
                        initialActiveTab={tabs.findIndex(tab => tab.value === activeTab)}
                        onTabChanged={tab => changeTab(tab.value as StickerLibraryTab)}
                    />
                    {activeTab === 'account' &&
                        (stickerLibraryAccess.accountLibrary ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.ACCOUNT_DESCRIPTION')}</p>
                                <StickerLibraryManager api={accountApi} />
                            </div>
                        ) : (
                            <LockedNotice message={t('STICKER_LIBRARY.LOCKED_ACCOUNT_LIBRARY')} />
                        ))}
                    {activeTab === 'platform' && stickerLibraryAccess.platformLibrary && (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-n-slate-11">{t('STICKER_LIBRARY.PLATFORM_DESCRIPTION')}</p>
                            <StickerLibraryManager api={platformApi} />
                        </div>
                    )}
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
