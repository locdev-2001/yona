import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import CategoryForm from './CategoryForm';
import type { CategoryFormState } from './CategoryForm';
import { createCategory, updateCategory } from '../store';
import type { Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/CategoryDialog.vue
// (popover neo dưới nút, không phải modal).
interface CategoryDialogProps {
    mode?: 'edit' | 'create';
    selectedCategory?: Category | null;
    portalSlug: string;
    portalName?: string;
    activeLocaleName?: string;
    activeLocaleCode?: string;
    onClose: () => void;
}

export default function CategoryDialog({
    mode = 'edit',
    selectedCategory = null,
    portalSlug,
    portalName = '',
    activeLocaleName = '',
    activeLocaleCode = '',
    onClose,
}: CategoryDialogProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const handleCategory = async (formData: CategoryFormState) => {
        const payload: Record<string, unknown> = {
            name: formData.name,
            icon: formData.icon,
            icon_color: formData.iconColor,
            description: formData.description,
        };

        try {
            if (mode === 'create') {
                payload.locale = formData.locale;
                await createCategory(accountId, portalSlug, payload);
            } else {
                await updateCategory(accountId, portalSlug, Number(formData.id), payload);
            }

            useAlert(t(`HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.${mode.toUpperCase()}.API.SUCCESS_MESSAGE`));
            onClose();
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) ||
                    t(`HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.${mode.toUpperCase()}.API.ERROR_MESSAGE`),
            );
        }
    };

    return (
        <div className="w-[25rem] absolute top-10 ltr:right-0 rtl:left-0 bg-n-alpha-3 backdrop-blur-[100px] p-6 rounded-xl border border-n-weak shadow-md flex flex-col gap-6">
            <h3 className="text-base font-medium text-n-slate-12">
                {t(`HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.${mode.toUpperCase()}`)}
            </h3>
            <CategoryForm
                mode={mode}
                selectedCategory={selectedCategory}
                activeLocaleCode={activeLocaleCode}
                portalName={portalName}
                activeLocaleName={activeLocaleName}
                onSubmit={handleCategory}
                onCancel={onClose}
            />
        </div>
    );
}
