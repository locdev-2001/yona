import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../i18n';
import { pickedAvatarChoice, pickedAvatarIndex } from './avatarSeed';
import type { AvatarSubject } from './avatarSeed';
import { avatarSeed } from './avatarSeed';

const CHOICES_PER_PAGE = 24;
const CHOICE_SIZE_PX = 48;

// Mở lưới đủ dài để thấy hình đang dùng (đã chọn ở trang "xem thêm" trước đó).
function choiceCountShowing(current: string | null): number {
    const index = current ? pickedAvatarIndex(current) : null;

    return Math.max(CHOICES_PER_PAGE, Math.ceil((index ?? 0) / CHOICES_PER_PAGE) * CHOICES_PER_PAGE);
}

interface AvatarPickerDialogProps {
    title: string;
    description: string;
    // Loại chủ thể dựng hình, phải trùng với chỗ hiển thị avatar sau khi chọn.
    subject: AvatarSubject;
    current: string | null;
    onConfirm: (choice: string) => Promise<boolean>;
}

// Hộp chọn avatar hình khối từ một lưới dựng sẵn (pick-1, pick-2…), bấm "xem thêm" để mở rộng.
const AvatarPickerDialog = forwardRef<DialogHandle, AvatarPickerDialogProps>(function AvatarPickerDialog(
    { title, description, subject, current, onConfirm },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const [selected, setSelected] = useState<string | null>(current);
    const [choiceCount, setChoiceCount] = useState(() => choiceCountShowing(current));
    const [isSubmitting, setSubmitting] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => {
            setSelected(current);
            setChoiceCount(choiceCountShowing(current));
            dialogRef.current?.open();
        },
        close: () => dialogRef.current?.close(),
    }));

    const confirm = async () => {
        if (!selected || isSubmitting) return;
        setSubmitting(true);
        const done = await onConfirm(selected).finally(() => setSubmitting(false));
        if (done) dialogRef.current?.close();
    };

    const choices = Array.from({ length: choiceCount }, (_, index) => pickedAvatarChoice(index + 1));

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={title}
            description={description}
            confirmButtonLabel={t('CHAT.GROUP.SAVE')}
            disableConfirmButton={!selected || selected === current}
            isLoading={isSubmitting}
            overflowYAuto
            onConfirm={() => void confirm()}
        >
            <div className="flex flex-col items-center gap-4">
                <ul className="grid grid-cols-4 sm:grid-cols-6 gap-3 m-0 p-0 list-none">
                    {choices.map((choice, index) => {
                        const isSelected = choice === selected;
                        return (
                            <li key={choice}>
                                <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    aria-label={t('CHAT.GROUP.PICK_AVATAR', { number: index + 1 })}
                                    className={`flex p-1 rounded-full outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-n-brand ${
                                        isSelected ? 'ring-2 ring-n-brand' : 'hover:ring-2 hover:ring-n-weak'
                                    }`}
                                    onClick={() => setSelected(choice)}
                                >
                                    <Avatar seed={avatarSeed(subject, choice)} name="" size={CHOICE_SIZE_PX} roundedFull />
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <Button
                    faded
                    slate
                    sm
                    icon="i-lucide-chevron-down"
                    label={t('CHAT.GROUP.MORE_AVATARS')}
                    onClick={() => setChoiceCount(count => count + CHOICES_PER_PAGE)}
                />
            </div>
        </Dialog>
    );
});

export default AvatarPickerDialog;
