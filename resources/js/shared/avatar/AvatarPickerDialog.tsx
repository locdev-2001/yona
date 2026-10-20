import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../i18n';
import { pickedAvatarChoice, pickedAvatarIndex } from './avatarSeed';
import type { AvatarSubject } from './avatarSeed';
import { avatarSeed } from './avatarSeed';

const CHOICES_PER_PAGE = 24;
export const CHOICE_SIZE_PX = 48;
const CHOICE_BUTTON_CLASS = 'flex p-1 rounded-full outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-n-brand';
const CHOICE_SELECTED_CLASS = 'ring-2 ring-n-brand';
const CHOICE_IDLE_CLASS = 'hover:ring-2 hover:ring-n-weak';

// Số ô của lưới (kể cả ô mặc định), đủ dài để thấy hình đang dùng (đã chọn ở trang "xem thêm" trước đó).
function cellCountShowing(current: string | null, leadingCells: number): number {
    const index = current ? pickedAvatarIndex(current) : null;

    return Math.max(CHOICES_PER_PAGE, Math.ceil(((index ?? 0) + leadingCells) / CHOICES_PER_PAGE) * CHOICES_PER_PAGE);
}

interface AvatarPickerDialogProps {
    title: string;
    description: string;
    // Loại chủ thể dựng hình, phải trùng với chỗ hiển thị avatar sau khi chọn.
    subject: AvatarSubject;
    // null = đang dùng lựa chọn mặc định (nếu có).
    current: string | null;
    // Ô đầu lưới để quay về avatar mặc định; chọn ô này gửi null.
    defaultOption?: { label: string; preview: ReactNode };
    onConfirm: (choice: string | null) => Promise<boolean>;
}

// Hộp chọn avatar hình khối từ một lưới dựng sẵn (pick-1, pick-2…), bấm "xem thêm" để mở rộng.
const AvatarPickerDialog = forwardRef<DialogHandle, AvatarPickerDialogProps>(function AvatarPickerDialog(
    { title, description, subject, current, defaultOption, onConfirm },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const [selected, setSelected] = useState<string | null>(current);
    const leadingCells = defaultOption ? 1 : 0;
    const [cellCount, setCellCount] = useState(() => cellCountShowing(current, leadingCells));
    const [isSubmitting, setSubmitting] = useState(false);

    useImperativeHandle(ref, () => ({
        open: () => {
            setSelected(current);
            setCellCount(cellCountShowing(current, leadingCells));
            dialogRef.current?.open();
        },
        close: () => dialogRef.current?.close(),
    }));

    const confirm = async () => {
        if ((!selected && !defaultOption) || isSubmitting) return;
        setSubmitting(true);
        const done = await onConfirm(selected).finally(() => setSubmitting(false));
        if (done) dialogRef.current?.close();
    };

    const choices = Array.from({ length: cellCount - leadingCells }, (_, index) => pickedAvatarChoice(index + 1));

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={title}
            description={description}
            confirmButtonLabel={t('CHAT.GROUP.SAVE')}
            disableConfirmButton={(!selected && !defaultOption) || selected === current}
            isLoading={isSubmitting}
            overflowYAuto
            onConfirm={() => void confirm()}
        >
            <div className="flex flex-col items-center gap-4">
                <ul className="grid grid-cols-4 sm:grid-cols-6 gap-3 m-0 p-0 list-none">
                    {defaultOption ? (
                        <li>
                            <button
                                type="button"
                                aria-pressed={selected === null}
                                aria-label={defaultOption.label}
                                title={defaultOption.label}
                                className={`${CHOICE_BUTTON_CLASS} ${selected === null ? CHOICE_SELECTED_CLASS : CHOICE_IDLE_CLASS}`}
                                onClick={() => setSelected(null)}
                            >
                                {defaultOption.preview}
                            </button>
                        </li>
                    ) : null}
                    {choices.map((choice, index) => {
                        const isSelected = choice === selected;
                        return (
                            <li key={choice}>
                                <button
                                    type="button"
                                    aria-pressed={isSelected}
                                    aria-label={t('CHAT.GROUP.PICK_AVATAR', { number: index + 1 })}
                                    className={`${CHOICE_BUTTON_CLASS} ${isSelected ? CHOICE_SELECTED_CLASS : CHOICE_IDLE_CLASS}`}
                                    onClick={() => setSelected(choice)}
                                >
                                    <Avatar seed={avatarSeed(subject, choice)} name="" size={CHOICE_SIZE_PX} roundedFull />
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <Button
                    type="button"
                    faded
                    slate
                    sm
                    icon="i-lucide-chevron-down"
                    label={t('CHAT.GROUP.MORE_AVATARS')}
                    onClick={() => setCellCount(count => count + CHOICES_PER_PAGE)}
                />
            </div>
        </Dialog>
    );
});

export default AvatarPickerDialog;
