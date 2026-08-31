import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import FormInput from 'v3/components/Form/Input';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { PickerSelection } from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { Team, TeamFormPayload } from './types';

// Port từ dashboard/routes/dashboard/settings/teams/TeamForm.vue
// (validations.js: title required + minLength 2).
interface TeamFormProps {
    formData?: Team | null;
    submitButtonText: string;
    submitInProgress?: boolean;
    onSubmit: (payload: TeamFormPayload) => void;
}

export default function TeamForm({
    formData = null,
    submitButtonText,
    submitInProgress = false,
    onSubmit,
}: TeamFormProps) {
    const [title, setTitle] = useState(formData?.name ?? '');
    const [description, setDescription] = useState(formData?.description ?? '');
    const [allowAutoAssign, setAllowAutoAssign] = useState(formData?.allow_auto_assign ?? true);
    const [icon, setIcon] = useState(formData?.icon ?? '');
    const [iconColor, setIconColor] = useState(formData?.icon_color ?? '');
    const [titleTouched, setTitleTouched] = useState(false);
    const [isIconPickerOpen, setIconPickerOpen] = useState(false);

    const pickerWrapper = useRef<HTMLDivElement>(null);

    const titleInvalid = title.trim().length < 2;

    useEffect(() => {
        if (!isIconPickerOpen) return undefined;

        const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
            if (!pickerWrapper.current?.contains(event.target as Node)) setIconPickerOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [isIconPickerOpen]);

    const selectIcon = ({ type, value, color }: PickerSelection) => {
        setIcon(value);
        setIconColor(type === 'icon' ? (color ?? '') : '');
        setIconPickerOpen(false);
    };

    const removeIcon = () => {
        setIcon('');
        setIconColor('');
        setIconPickerOpen(false);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setTitleTouched(true);
        if (titleInvalid) return;

        onSubmit({
            name: title,
            description,
            allow_auto_assign: allowAutoAssign,
            icon,
            icon_color: iconColor,
        });
    };

    return (
        <div className="flex-shrink-0 w-full">
            <form className="mx-0 grid gap-4" onSubmit={handleSubmit}>
                <div className="relative">
                    <FormInput
                        value={title}
                        className="!ps-12"
                        name="title"
                        spacing="compact"
                        label={t('TEAMS_SETTINGS.FORM.NAME.LABEL')}
                        placeholder={t('TEAMS_SETTINGS.FORM.NAME.PLACEHOLDER')}
                        hasError={titleTouched && titleInvalid}
                        errorMessage={t('TEAMS_SETTINGS.FORM.NAME.ERROR')}
                        onChange={event => setTitle(event.target.value)}
                        onBlur={() => setTitleTouched(true)}
                    />
                    <div className="absolute top-[1.75rem] start-0" ref={pickerWrapper}>
                        <Button
                            type="button"
                            variant="ghost"
                            color="slate"
                            className="text-lg !size-[2.5rem] !p-0 ltr:!rounded-r-none rtl:!rounded-l-none"
                            onClick={() => setIconPickerOpen(open => !open)}
                        >
                            {icon ? (
                                <EmojiIcon value={icon} color={iconColor} className="size-5 text-xl !leading-5" />
                            ) : (
                                <Icon icon="i-lucide-smile-plus " className="size-4" />
                            )}
                        </Button>
                        {isIconPickerOpen ? (
                            <EmojiIconPicker
                                className="start-0 top-10"
                                value={icon}
                                color={iconColor}
                                showRemoveButton
                                onSelect={selectIcon}
                                onColorChange={setIconColor}
                                onRemove={removeIcon}
                            />
                        ) : null}
                    </div>
                </div>
                <FormInput
                    value={description}
                    name="description"
                    spacing="compact"
                    label={t('TEAMS_SETTINGS.FORM.DESCRIPTION.LABEL')}
                    placeholder={t('TEAMS_SETTINGS.FORM.DESCRIPTION.PLACEHOLDER')}
                    onChange={event => setDescription(event.target.value)}
                />
                <div className="w-full flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={allowAutoAssign}
                        onChange={event => setAllowAutoAssign(event.target.checked)}
                    />
                    <label htmlFor="conversation_creation">{t('TEAMS_SETTINGS.FORM.AUTO_ASSIGN.LABEL')}</label>
                </div>
                <div className="flex flex-row justify-end gap-2 py-2 px-0 w-full">
                    <div className="w-full">
                        <Button
                            type="submit"
                            label={submitButtonText}
                            disabled={titleInvalid || submitInProgress}
                            isLoading={submitInProgress}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}
