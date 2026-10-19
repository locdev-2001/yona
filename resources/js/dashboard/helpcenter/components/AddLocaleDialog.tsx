import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import allLocales from 'shared/constants/locales';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { updatePortal } from '../store';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/LocalePage/AddLocaleDialog.vue.
const AddLocaleDialog = forwardRef<DialogHandle, { portal: Portal | null }>(function AddLocaleDialog({ portal }, ref) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);

    const [selectedLocale, setSelectedLocale] = useState('');
    const [localeStatus, setLocaleStatus] = useState('published');

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const addedLocales = (portal?.config?.allowed_locales ?? []).map(locale => locale.code);
    const draftedLocales = (portal?.config?.allowed_locales ?? [])
        .filter(locale => locale.draft)
        .map(locale => locale.code);

    const localeOptions = useMemo(
        () =>
            Object.keys(allLocales)
                .map(key => ({ value: key, label: `${allLocales[key]} (${key})` }))
                .filter(option => !addedLocales.includes(option.value)),
        [addedLocales.join(',')],
    );

    const statusOptions = [
        { value: 'published', label: t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.STATUS.OPTIONS.LIVE') },
        { value: 'draft', label: t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.STATUS.OPTIONS.DRAFT') },
    ];

    const onCreate = async () => {
        if (!selectedLocale) return;

        const updatedLocales = [...addedLocales, selectedLocale];
        const updatedDraftLocales =
            localeStatus === 'draft' ? [...new Set([...draftedLocales, selectedLocale])] : draftedLocales;

        try {
            await updatePortal(accountId, portal?.slug ?? '', {
                config: {
                    allowed_locales: updatedLocales,
                    draft_locales: updatedDraftLocales,
                    default_locale: portal?.meta?.default_locale,
                },
            });
            setSelectedLocale('');
            setLocaleStatus('published');
            dialogRef.current?.close();
            useAlert(t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.API.ERROR_MESSAGE'));
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.TITLE')}
            description={t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.DESCRIPTION')}
            onClose={() => {
                setSelectedLocale('');
                setLocaleStatus('published');
            }}
            onConfirm={onCreate}
        >
            <div className="flex flex-col gap-6">
                <ComboBox
                    value={selectedLocale}
                    options={localeOptions}
                    placeholder={t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.COMBOBOX.PLACEHOLDER')}
                    className="[&>div>button:not(.focused)]:!outline-n-slate-5"
                    onChange={setSelectedLocale}
                />
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-n-slate-12">
                        {t('HELP_CENTER.LOCALES_PAGE.ADD_LOCALE_DIALOG.STATUS.LABEL')}
                    </span>
                    <ComboBox
                        value={localeStatus}
                        options={statusOptions}
                        className="[&>div>button:not(.focused)]:!outline-n-slate-5"
                        onChange={value => setLocaleStatus(value || 'published')}
                    />
                </div>
            </div>
        </Dialog>
    );
});

export default AddLocaleDialog;
