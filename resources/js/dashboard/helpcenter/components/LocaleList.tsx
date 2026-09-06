import { useRef } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import LocaleCard from './LocaleCard';
import LocaleContentDialog from './LocaleContentDialog';
import type { LocaleDialogHandle } from './LocaleContentDialog';
import PopularContentDialog from './PopularContentDialog';
import { updatePortal } from '../store';
import type { AllowedLocaleOption, Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/LocalePage/LocaleList.vue.
interface LocaleListProps {
    locales: AllowedLocaleOption[];
    portal: Portal | null;
}

export default function LocaleList({ locales, portal }: LocaleListProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const contentDialogRef = useRef<LocaleDialogHandle>(null);
    const popularContentDialogRef = useRef<LocaleDialogHandle>(null);

    const updatePortalLocales = async ({
        newAllowedLocales,
        newDraftLocales,
        defaultLocale,
        messageKey,
    }: {
        newAllowedLocales: string[];
        newDraftLocales: string[];
        defaultLocale?: string;
        messageKey: string;
    }) => {
        let alertMessage = '';
        try {
            await updatePortal(accountId, portal?.slug ?? '', {
                config: {
                    default_locale: defaultLocale,
                    allowed_locales: newAllowedLocales,
                    draft_locales: newDraftLocales,
                },
            });
            alertMessage = t(`HELP_CENTER.PORTAL.${messageKey}.API.SUCCESS_MESSAGE`);
        } catch (error) {
            alertMessage = parseApiErrorMessage(error) || t(`HELP_CENTER.PORTAL.${messageKey}.API.ERROR_MESSAGE`);
        } finally {
            useAlert(alertMessage);
        }
    };

    const allCodes = () => locales.map(locale => locale.code);
    const draftCodes = () => locales.filter(locale => locale.isDraft).map(locale => locale.code);

    const changeDefaultLocale = (localeCode: string) =>
        updatePortalLocales({
            newAllowedLocales: allCodes(),
            newDraftLocales: draftCodes(),
            defaultLocale: localeCode,
            messageKey: 'CHANGE_DEFAULT_LOCALE',
        });

    const deletePortalLocale = (localeCode: string) =>
        updatePortalLocales({
            newAllowedLocales: allCodes().filter(code => code !== localeCode),
            newDraftLocales: draftCodes().filter(code => code !== localeCode),
            defaultLocale: portal?.meta?.default_locale,
            messageKey: 'DELETE_LOCALE',
        });

    const updateDraftLocales = (localeCode: string, shouldDraft: boolean, messageKey: string) =>
        updatePortalLocales({
            newAllowedLocales: allCodes(),
            newDraftLocales: shouldDraft
                ? [...new Set([...draftCodes(), localeCode])]
                : draftCodes().filter(code => code !== localeCode),
            defaultLocale: portal?.meta?.default_locale,
            messageKey,
        });

    const handleAction = (action: string, localeCode: string) => {
        if (action === 'change-default') void changeDefaultLocale(localeCode);
        else if (action === 'move-to-draft') void updateDraftLocales(localeCode, true, 'DRAFT_LOCALE');
        else if (action === 'publish-locale') void updateDraftLocales(localeCode, false, 'PUBLISH_LOCALE');
        else if (action === 'customize-content') contentDialogRef.current?.openForLocale(localeCode);
        else if (action === 'select-popular-content') popularContentDialogRef.current?.openForLocale(localeCode);
        else if (action === 'delete') void deletePortalLocale(localeCode);
    };

    return (
        <ul role="list" className="w-full h-full space-y-4">
            {locales.map((locale, index) => (
                <LocaleCard
                    key={index}
                    locale={locale.name}
                    isDefault={portal?.meta?.default_locale === locale.code}
                    isDraft={Boolean(locale.isDraft)}
                    localeCode={locale.code}
                    articleCount={locale.articlesCount || 0}
                    categoryCount={locale.categoriesCount || 0}
                    onAction={({ action }) => handleAction(action, locale.code)}
                />
            ))}
            <LocaleContentDialog ref={contentDialogRef} portal={portal} />
            <PopularContentDialog ref={popularContentDialogRef} portal={portal} />
        </ul>
    );
}
