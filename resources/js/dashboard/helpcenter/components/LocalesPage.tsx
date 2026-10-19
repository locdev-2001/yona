import { useMemo, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';
import Input from 'dashboard/components-next/input/Input';
import Loader from 'shared/components/loader/Loader';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import AddLocaleDialog from './AddLocaleDialog';
import HelpCenterLayout from './HelpCenterLayout';
import LocaleList from './LocaleList';
import { useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Portal } from '../types';

// Port từ components-next/HelpCenter/Pages/LocalePage/LocalesPage.vue.
interface LocalesPageProps {
    locales: AllowedLocaleOption[];
    portal: Portal | null;
    portalSlug: string;
}

export default function LocalesPage({ locales, portal, portalSlug }: LocalesPageProps) {
    const addLocaleDialogRef = useRef<DialogHandle>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { portalUiFlags } = useHelpCenterState();

    const filteredLocales = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return locales;

        return locales.filter(
            locale => locale.name?.toLowerCase().includes(query) || locale.code?.toLowerCase().includes(query),
        );
    }, [locales, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    return (
        <HelpCenterLayout
            showPaginationFooter={false}
            portalSlug={portalSlug}
            breadcrumbLabel={t('HELP_CENTER.BREADCRUMB.LOCALES')}
            headerActions={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-n-slate-12">
                            {t('HELP_CENTER.LOCALES_PAGE.LOCALES_COUNT', { n: locales.length })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            value={searchQuery}
                            placeholder={t('HELP_CENTER.LOCALES_PAGE.SEARCH_PLACEHOLDER')}
                            type="search"
                            size="sm"
                            className="w-48"
                            onChange={event => setSearchQuery(event.target.value)}
                        />
                        <Button
                            label={t('HELP_CENTER.LOCALES_PAGE.NEW_LOCALE_BUTTON_TEXT')}
                            icon="i-lucide-plus"
                            size="sm"
                            onClick={() => addLocaleDialogRef.current?.open()}
                        />
                    </div>
                </div>
            }
            content={
                portalUiFlags.isSwitching ? (
                    <div className="flex items-center justify-center py-10 text-n-slate-11">
                        <Loader />
                    </div>
                ) : isSearching && !filteredLocales.length ? (
                    <EmptyStateLayout
                        title={t('HELP_CENTER.LOCALES_PAGE.SEARCH_EMPTY_STATE.TITLE')}
                        subtitle={t('HELP_CENTER.LOCALES_PAGE.SEARCH_EMPTY_STATE.SUBTITLE')}
                        showBackdrop={false}
                    />
                ) : (
                    <LocaleList locales={filteredLocales} portal={portal} />
                )
            }
        >
            <AddLocaleDialog ref={addLocaleDialogRef} portal={portal} />
        </HelpCenterLayout>
    );
}
