import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Input from 'dashboard/components-next/input/Input';
import { updatePortal } from '../store';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/LocalePage/LocaleContentDialog.vue.
export interface LocaleDialogHandle {
    openForLocale: (localeCode: string) => void;
}

const LocaleContentDialog = forwardRef<LocaleDialogHandle, { portal: Portal | null }>(function LocaleContentDialog(
    { portal },
    ref,
) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);

    const [activeLocale, setActiveLocale] = useState('');
    const [name, setName] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [headerText, setHeaderText] = useState('');

    const localeTranslations = portal?.config?.locale_translations ?? {};

    useImperativeHandle(ref, () => ({
        openForLocale: (localeCode: string) => {
            const existing = localeTranslations[localeCode] ?? {};
            setActiveLocale(localeCode);
            setName(existing.name ?? '');
            setPageTitle(existing.page_title ?? '');
            setHeaderText(existing.header_text ?? '');
            dialogRef.current?.open();
        },
    }));

    const onConfirm = async () => {
        const translations = { ...localeTranslations };
        const fields: Record<string, string> = {};
        if (name.trim()) fields.name = name.trim();
        if (pageTitle.trim()) fields.page_title = pageTitle.trim();
        if (headerText.trim()) fields.header_text = headerText.trim();

        if (Object.keys(fields).length) translations[activeLocale] = fields;
        else delete translations[activeLocale];

        try {
            await updatePortal(accountId, portal?.slug ?? '', { config: { locale_translations: translations } });
            dialogRef.current?.close();
            useAlert(t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.API.ERROR_MESSAGE'));
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.TITLE')}
            description={t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.DESCRIPTION')}
            onConfirm={onConfirm}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-n-slate-12">
                        {t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.NAME.LABEL')}
                    </label>
                    <Input value={name} placeholder={portal?.name} onChange={event => setName(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-n-slate-12">
                        {t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.PAGE_TITLE.LABEL')}
                    </label>
                    <Input
                        value={pageTitle}
                        placeholder={portal?.page_title ?? ''}
                        onChange={event => setPageTitle(event.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-n-slate-12">
                        {t('HELP_CENTER.LOCALES_PAGE.CONTENT_DIALOG.HEADER_TEXT.LABEL')}
                    </label>
                    <Input
                        value={headerText}
                        placeholder={portal?.header_text ?? ''}
                        onChange={event => setHeaderText(event.target.value)}
                    />
                </div>
            </div>
        </Dialog>
    );
});

export default LocaleContentDialog;
