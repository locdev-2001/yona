import { useMemo } from 'react';
import { Head } from '@inertiajs/react';

import { t } from '../../i18n';
import StickerLibraryManager from 'dashboard/settings/customStickers/StickerLibraryManager';
import { createStickerLibraryApi } from 'dashboard/settings/customStickers/stickerLibraryApi';

// Kho sticker chung của Yona: cùng màn quản trị với kho riêng của tài khoản.
export default function StickerPacks({ apiBaseUrl }: { apiBaseUrl: string }) {
    const api = useMemo(() => createStickerLibraryApi(apiBaseUrl), [apiBaseUrl]);

    return (
        <>
            <Head title={t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')} />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">{t('STICKER_LIBRARY.SUPER_ADMIN_HEADER')}</h1>
            </header>
            <section className="main-content__body flex flex-col gap-3 md:h-[calc(100dvh-3.5rem)]">
                <p className="m-0 text-sm text-n-slate-11">{t('STICKER_LIBRARY.SUPER_ADMIN_DESCRIPTION')}</p>
                <div className="min-h-0 flex-1">
                    <StickerLibraryManager api={api} />
                </div>
            </section>
        </>
    );
}
