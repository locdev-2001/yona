import { useMemo } from 'react';
import { Head } from '@inertiajs/react';

import { t } from '../../i18n';
import StickerLibraryManager from 'dashboard/settings/customStickers/StickerLibraryManager';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';

// Kho sticker chung của Yona: cùng màn quản trị với kho riêng của account.
export default function StickerPacks({ apiBaseUrl }: { apiBaseUrl: string }) {
    const api = useMemo(() => createStickerLibraryApi(apiBaseUrl), [apiBaseUrl]);

    return (
        <>
            <Head title={t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')} />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">{t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')}</h1>
            </header>
            <section className="main-content__body flex flex-col gap-4">
                <p className="text-sm text-slate-700">{t('STICKER_LIBRARY.SUPER_ADMIN_DESCRIPTION')}</p>
                <StickerLibraryManager api={api} />
            </section>
        </>
    );
}
