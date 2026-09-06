import { forwardRef, useImperativeHandle, useRef } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import CategoryForm from './CategoryForm';
import type { CategoryFormHandle } from './CategoryForm';
import { categoryUiFlags, updateCategory, useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/EditCategoryDialog.vue.
interface EditCategoryDialogProps {
    selectedCategory: Category | null;
    allowedLocales: AllowedLocaleOption[];
    portalSlug: string;
    locale: string;
}

const EditCategoryDialog = forwardRef<DialogHandle, EditCategoryDialogProps>(function EditCategoryDialog(
    { selectedCategory, allowedLocales, portalSlug, locale },
    ref,
) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);
    const categoryFormRef = useRef<CategoryFormHandle>(null);

    useHelpCenterState();
    const isUpdatingCategory = Boolean(categoryUiFlags(selectedCategory?.id).isUpdating);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const activeLocale = allowedLocales.find(item => item.code === locale);

    const onUpdateCategory = async () => {
        const state = categoryFormRef.current?.state;
        if (!state) return;

        try {
            await updateCategory(accountId, portalSlug, Number(state.id), {
                name: state.name,
                icon: state.icon,
                icon_color: state.iconColor,
                description: state.description,
            });
            useAlert(t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.EDIT.API.SUCCESS_MESSAGE'));
            dialogRef.current?.close();
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) || t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.EDIT.API.ERROR_MESSAGE'),
            );
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.EDIT')}
            description={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.DESCRIPTION')}
            isLoading={isUpdatingCategory}
            disableConfirmButton={isUpdatingCategory}
            onConfirm={onUpdateCategory}
        >
            <CategoryForm
                ref={categoryFormRef}
                mode="edit"
                selectedCategory={selectedCategory}
                activeLocaleCode={activeLocale?.code ?? ''}
                portalName={portalSlug}
                activeLocaleName={activeLocale?.name ?? ''}
                showActionButtons={false}
            />
        </Dialog>
    );
});

export default EditCategoryDialog;
