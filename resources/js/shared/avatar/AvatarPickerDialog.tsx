import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../i18n';
import AvatarEditor from './AvatarEditor';
import type { GeneratedAvatarValue } from './AvatarEditor';
import { avatarSeed } from './avatarSeed';
import type { AvatarSubject } from './avatarSeed';
import { AVATAR_IMAGE_TYPES, squareAvatarImage } from './squareAvatarImage';

export const CHOICE_SIZE_PX = 48;

type AvatarSource = 'default' | 'photo' | 'generated';
type PendingPhoto = { blob: Blob; url: string };

const SOURCE_CLASS = 'flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-n-brand';
const SOURCE_SELECTED_CLASS = 'bg-n-alpha-2 text-n-slate-12 ring-1 ring-n-brand';
const SOURCE_IDLE_CLASS = 'text-n-slate-11 hover:bg-n-alpha-1';

interface AvatarPickerDialogProps {
    title: string;
    description: string;
    // Loại chủ thể dựng hình khối, phải trùng với chỗ hiển thị avatar sau khi lưu.
    subject: AvatarSubject;
    // Hình khối đang dùng; null = đang dùng ảnh hoặc lựa chọn mặc định.
    current: GeneratedAvatarValue | null;
    // Tên mở đầu khi chưa có hình khối riêng (thường là hình mặc định của chủ thể).
    initialName: string;
    // Lựa chọn mặc định của nơi gọi (vd ghép ảnh thành viên); chọn nó gửi null.
    defaultOption?: { label: string; preview: ReactNode };
    // Cho tải ảnh từ máy: `url` là ảnh đang dùng (null = chưa có); ảnh thắng mọi hình khối.
    photo?: { url: string | null; onConfirm: (photo: Blob) => Promise<boolean> };
    onConfirm: (avatar: GeneratedAvatarValue | null) => Promise<boolean>;
}

function sameAvatar(left: GeneratedAvatarValue | null, right: GeneratedAvatarValue | null): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

// Hộp đổi avatar dùng chung: chọn nguồn (mặc định, ảnh tải lên, tự tạo hình khối bằng AvatarEditor)
// rồi lưu một lần.
const AvatarPickerDialog = forwardRef<DialogHandle, AvatarPickerDialogProps>(function AvatarPickerDialog(
    { title, description, subject, current, initialName, defaultOption, photo, onConfirm },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentSource: AvatarSource = photo?.url ? 'photo' : current ? 'generated' : defaultOption ? 'default' : 'generated';
    const startingValue = (): GeneratedAvatarValue => current ?? { name: initialName, traits: null };
    const [source, setSource] = useState<AvatarSource>(currentSource);
    const [generated, setGenerated] = useState<GeneratedAvatarValue>(startingValue);
    const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);
    const photoUrl = pendingPhoto?.url ?? photo?.url ?? null;

    useEffect(() => () => {
        if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.url);
    }, [pendingPhoto]);

    useImperativeHandle(ref, () => ({
        open: () => {
            setSource(currentSource);
            setGenerated(startingValue());
            setPendingPhoto(null);
            dialogRef.current?.open();
        },
        close: () => dialogRef.current?.close(),
    }));

    const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const blob = await squareAvatarImage(file);
            setPendingPhoto({ blob, url: URL.createObjectURL(blob) });
            setSource('photo');
        } catch {
            useAlert(t('CHAT.GROUP.PHOTO_UNREADABLE'));
        }
    };

    const canConfirm =
        (source === 'default' && currentSource !== 'default') ||
        (source === 'photo' && pendingPhoto !== null) ||
        (source === 'generated' && generated.name.trim() !== '' && (currentSource !== 'generated' || !sameAvatar(generated, current)));

    const confirm = async () => {
        if (!canConfirm || isSubmitting) return;
        setSubmitting(true);
        const save =
            source === 'photo' && pendingPhoto && photo
                ? photo.onConfirm(pendingPhoto.blob)
                : onConfirm(source === 'generated' ? { name: generated.name.trim(), traits: generated.traits } : null);
        const done = await save.finally(() => setSubmitting(false));
        if (done) dialogRef.current?.close();
    };

    const sourceButton = (value: AvatarSource, label: string, preview: ReactNode, onClick: () => void) => (
        <button
            type="button"
            aria-pressed={source === value}
            className={`${SOURCE_CLASS} ${source === value ? SOURCE_SELECTED_CLASS : SOURCE_IDLE_CLASS}`}
            onClick={onClick}
        >
            {preview}
            <span className="text-center">{label}</span>
        </button>
    );

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={title}
            description={description}
            confirmButtonLabel={t('CHAT.GROUP.SAVE')}
            disableConfirmButton={!canConfirm}
            isLoading={isSubmitting}
            overflowYAuto
            onConfirm={() => void confirm()}
        >
            <div className="flex flex-col gap-5">
                <div className={`grid gap-2 ${defaultOption && photo ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {defaultOption ? sourceButton('default', defaultOption.label, defaultOption.preview, () => setSource('default')) : null}
                    {photo
                        ? sourceButton(
                              'photo',
                              t(photoUrl ? 'CHAT.GROUP.UPLOADED_PHOTO' : 'CHAT.GROUP.UPLOAD_PHOTO'),
                              photoUrl ? (
                                  <Avatar src={photoUrl} name="" size={CHOICE_SIZE_PX} roundedFull />
                              ) : (
                                  <span className="flex items-center justify-center size-12 rounded-full bg-n-alpha-2 text-n-slate-11">
                                      <span className="i-lucide-image-up size-5" aria-hidden="true" />
                                  </span>
                              ),
                              () => (photoUrl ? setSource('photo') : fileInputRef.current?.click()),
                          )
                        : null}
                    {sourceButton(
                        'generated',
                        t('AVATAR_EDITOR.GENERATED'),
                        <Avatar seed={avatarSeed(subject, generated.name)} traits={generated.traits} name="" size={CHOICE_SIZE_PX} roundedFull />,
                        () => setSource('generated'),
                    )}
                </div>

                {photo ? (
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={AVATAR_IMAGE_TYPES.join(',')}
                        className="hidden"
                        onChange={event => void pickPhoto(event)}
                    />
                ) : null}
                {photo && source === 'photo' ? (
                    <Button
                        type="button"
                        faded
                        slate
                        sm
                        icon="i-lucide-image-up"
                        label={t('CHAT.GROUP.UPLOAD_PHOTO')}
                        className="self-center"
                        onClick={() => fileInputRef.current?.click()}
                    />
                ) : null}

                {source === 'generated' ? <AvatarEditor subject={subject} value={generated} onChange={setGenerated} /> : null}
            </div>
        </Dialog>
    );
});

export default AvatarPickerDialog;
