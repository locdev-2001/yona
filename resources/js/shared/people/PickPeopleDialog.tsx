import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import FindPeopleDialog from 'dashboard/friends/FindPeopleDialog';
import { t } from '../../i18n';
import PeoplePicker from './PeoplePicker';
import type { PickedPerson } from './PeoplePicker';

interface PickPeopleDialogProps {
    title: string;
    description: string;
    confirmLabel: string;
    // Ô thêm phía trên danh sách (vd tên nhóm).
    header?: ReactNode;
    friendsOnly?: boolean;
    excludeIds?: number[];
    // Cho bấm xác nhận khi chưa chọn ai (tạo nhóm rồi mời bằng link sau).
    allowEmpty?: boolean;
    canConfirm?: boolean;
    // Trả true là xong việc, hộp tự đóng và xoá lựa chọn.
    onConfirm: (people: PickedPerson[]) => Promise<boolean>;
    onClose?: () => void;
}

// Hộp chọn nhiều người dùng chung cho tạo nhóm và thêm thành viên.
const PickPeopleDialog = forwardRef<DialogHandle, PickPeopleDialogProps>(function PickPeopleDialog(
    { title, description, confirmLabel, header, friendsOnly = false, excludeIds, allowEmpty = false, canConfirm = true, onConfirm, onClose },
    ref,
) {
    const dialogRef = useRef<DialogHandle>(null);
    const findPeopleRef = useRef<DialogHandle>(null);
    const [selected, setSelected] = useState<PickedPerson[]>([]);
    const [query, setQuery] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const reset = () => {
        setSelected([]);
        setQuery('');
    };

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const confirm = async () => {
        if (isSubmitting) return;
        setSubmitting(true);
        const done = await onConfirm(selected).finally(() => setSubmitting(false));
        if (done) dialogRef.current?.close();
    };

    // Chưa có bạn bè nào để chọn: đóng hộp này, mở hộp tìm người để kết bạn.
    const addFriendAction = friendsOnly ? (
        <Button
            faded
            slate
            sm
            icon="i-lucide-user-plus"
            label={t('FRIENDS.ADD.TITLE')}
            onClick={() => {
                dialogRef.current?.close();
                findPeopleRef.current?.open();
            }}
        />
    ) : null;

    return (
        <>
            <Dialog
                ref={dialogRef}
                title={title}
                description={description}
                confirmButtonLabel={confirmLabel}
                disableConfirmButton={!canConfirm || (!allowEmpty && selected.length === 0)}
                isLoading={isSubmitting}
                closeOnBackdrop={false}
                onConfirm={() => void confirm()}
                onClose={() => {
                    reset();
                    onClose?.();
                }}
            >
                <div className="flex flex-col gap-4">
                    {header}
                    <PeoplePicker
                        selected={selected}
                        onChange={setSelected}
                        query={query}
                        onQueryChange={setQuery}
                        excludeIds={excludeIds}
                        friendsOnly={friendsOnly}
                        emptyAction={addFriendAction}
                    />
                </div>
            </Dialog>
            {friendsOnly ? (
                <FindPeopleDialog ref={findPeopleRef} title={t('FRIENDS.ADD.TITLE')} description={t('FRIENDS.ADD.DESCRIPTION')} />
            ) : null}
        </>
    );
});

export default PickPeopleDialog;
