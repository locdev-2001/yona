import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import Input from 'dashboard/components-next/input/Input';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { categoryUiFlags, useHelpCenterState } from '../store';
import type { Category } from '../types';

// Port từ components-next/HelpCenter/Pages/CategoryPage/CategoryForm.vue.
// Khác biệt cố ý (lệnh founder): KHÔNG có ô slug — backend tự sinh từ tên.
export interface CategoryFormState {
    id?: number;
    name: string;
    icon: string;
    iconColor: string;
    description: string;
    locale: string;
}

export interface CategoryFormHandle {
    state: CategoryFormState;
    isSubmitDisabled: boolean;
}

interface CategoryFormProps {
    mode: 'edit' | 'create';
    selectedCategory?: Category | null;
    activeLocaleCode?: string;
    showActionButtons?: boolean;
    portalName?: string;
    activeLocaleName?: string;
    onSubmit?: (state: CategoryFormState) => void;
    onCancel?: () => void;
}

const CategoryForm = forwardRef<CategoryFormHandle, CategoryFormProps>(function CategoryForm(
    {
        mode,
        selectedCategory = null,
        activeLocaleCode = '',
        showActionButtons = true,
        portalName = '',
        activeLocaleName = '',
        onSubmit,
        onCancel,
    },
    ref,
) {
    const [state, setState] = useState<CategoryFormState>({
        id: undefined,
        name: '',
        icon: '',
        iconColor: '',
        description: '',
        locale: '',
    });
    const [isTouched, setTouched] = useState(false);
    const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const emojiWrapperRef = useRef<HTMLDivElement>(null);
    useClickAway(emojiWrapperRef, () => setEmojiPickerOpen(false), isEmojiPickerOpen);

    const { isCreatingCategory } = useHelpCenterState();
    const isUpdatingCategory = Boolean(categoryUiFlags(selectedCategory?.id).isUpdating);

    useEffect(() => {
        if (mode === 'edit' && selectedCategory) {
            setState({
                id: selectedCategory.id,
                name: selectedCategory.name,
                icon: selectedCategory.icon,
                iconColor: selectedCategory.icon_color || '',
                description: selectedCategory.description ?? '',
                locale: selectedCategory.locale,
            });
        }
    }, [mode, selectedCategory]);

    useEffect(() => {
        if (mode === 'create') setState(current => ({ ...current, locale: activeLocaleCode }));
    }, [mode, activeLocaleCode]);

    const isSubmitDisabled = state.name.trim().length < 1;
    const nameError =
        isTouched && isSubmitDisabled ? t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.FORM.NAME.ERROR') : '';

    useImperativeHandle(ref, () => ({ state, isSubmitDisabled }), [state, isSubmitDisabled]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-start gap-8 px-4 py-2 border rounded-lg border-n-strong">
                <div className="flex flex-col items-start w-full gap-2 py-2">
                    <span className="text-sm font-medium text-n-slate-11">
                        {t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.PORTAL')}
                    </span>
                    <span className="text-sm text-n-slate-12">{portalName}</span>
                </div>
                <div className="justify-start w-px h-10 bg-n-strong" />
                <div className="flex flex-col w-full gap-2 py-2">
                    <span className="text-sm font-medium text-n-slate-11">
                        {t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.HEADER.LOCALE')}
                    </span>
                    <span
                        title={`${activeLocaleName} (${activeLocaleCode})`}
                        className="text-sm line-clamp-1 text-n-slate-12"
                    >
                        {`${activeLocaleName} (${activeLocaleCode})`}
                    </span>
                </div>
            </div>
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Input
                        value={state.name}
                        label={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.FORM.NAME.LABEL')}
                        placeholder={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.FORM.NAME.PLACEHOLDER')}
                        message={nameError}
                        messageType={nameError ? 'error' : 'info'}
                        customInputClass="!h-10 ltr:!pl-12 rtl:!pr-12"
                        onChange={event => setState(current => ({ ...current, name: event.target.value }))}
                        onBlur={() => setTouched(true)}
                        prefix={
                            <div ref={emojiWrapperRef}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    color="slate"
                                    className="!h-[2.38rem] !w-[2.375rem] !p-0 absolute top-[2rem] start-px ltr:!rounded-r-none rtl:!rounded-l-none"
                                    onClick={() => setEmojiPickerOpen(open => !open)}
                                >
                                    {state.icon ? (
                                        <EmojiIcon
                                            value={state.icon}
                                            color={state.iconColor}
                                            className="size-5 text-xl !leading-5"
                                        />
                                    ) : (
                                        <span className="i-lucide-smile-plus size-4" />
                                    )}
                                </Button>
                                {isEmojiPickerOpen ? (
                                    <EmojiIconPicker
                                        anchorRef={emojiWrapperRef}
                                        value={state.icon}
                                        color={state.iconColor}
                                        showRemoveButton
                                        onSelect={({ type, value, color }) => {
                                            setState(current => ({
                                                ...current,
                                                icon: value,
                                                iconColor: type === 'icon' ? (color ?? '') : '',
                                            }));
                                            setEmojiPickerOpen(false);
                                        }}
                                        onColorChange={color => setState(current => ({ ...current, iconColor: color }))}
                                        onRemove={() => {
                                            setState(current => ({ ...current, icon: '', iconColor: '' }));
                                            setEmojiPickerOpen(false);
                                        }}
                                        onClose={() => setEmojiPickerOpen(false)}
                                    />
                                ) : null}
                            </div>
                        }
                    />
                </div>
                <TextArea
                    value={state.description}
                    onChange={value => setState(current => ({ ...current, description: value }))}
                    label={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.FORM.DESCRIPTION.LABEL')}
                    placeholder={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.FORM.DESCRIPTION.PLACEHOLDER')}
                    showCharacterCount
                />
                {showActionButtons ? (
                    <div className="flex items-center justify-between w-full gap-3">
                        <Button
                            variant="faded"
                            color="slate"
                            label={t('HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.BUTTONS.CANCEL')}
                            className="w-full bg-n-alpha-2 text-n-blue-11 hover:bg-n-alpha-3"
                            onClick={onCancel}
                        />
                        <Button
                            label={t(`HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.BUTTONS.${mode.toUpperCase()}`)}
                            className="w-full"
                            disabled={isSubmitDisabled || isCreatingCategory || isUpdatingCategory}
                            isLoading={isCreatingCategory || isUpdatingCategory}
                            onClick={() => {
                                setTouched(true);
                                if (!isSubmitDisabled) onSubmit?.(state);
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
});

export default CategoryForm;
