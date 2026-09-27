import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import BaseSettingsHeader from '../BaseSettingsHeader';
import StickerLibraryManager from './StickerLibraryManager';
import { createStickerLibraryApi } from './stickerLibraryApi';
import type { DashboardPageProps } from '../../types';

// Kho sticker riêng của account; route chỉ tồn tại khi cờ custom_stickers bật.
export default function CustomStickersIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const api = useMemo(() => createStickerLibraryApi(`/api/v1/accounts/${accountId}`), [accountId]);

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="flex w-full flex-col gap-6 px-6 py-8">
                    <BaseSettingsHeader
                        title={t('STICKER_LIBRARY.ACCOUNT_HEADER')}
                        description={t('STICKER_LIBRARY.ACCOUNT_DESCRIPTION')}
                    />
                    <StickerLibraryManager api={api} />
                </div>
            </SettingsWrapper>
        </Dashboard>
    );
}
