import { forwardRef } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import PeoplePicker from 'dashboard/conversation/people/PeoplePicker';
import { t } from '../../i18n';
import { sendFriendRequest } from './api';

interface AddFriendDialogProps {
    onSent?: () => void;
}

// Thêm bạn: tìm người dùng Yona theo @username hoặc tên, chọn là gửi lời mời kết bạn.
const AddFriendDialog = forwardRef<DialogHandle, AddFriendDialogProps>(function AddFriendDialog({ onSent }, ref) {
    const send = async (userId: number, name: string) => {
        try {
            const profile = await sendFriendRequest(userId);
            (ref as { current: DialogHandle | null } | null)?.current?.close();
            useAlert(t(profile.state === 'friends' ? 'FRIENDS.ADD.ALREADY_FRIENDS' : 'FRIENDS.ADD.SENT', { name }));
            onSent?.();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FRIENDS.ADD.ERROR'));
        }
    };

    return (
        <Dialog ref={ref} title={t('FRIENDS.ADD.TITLE')} description={t('FRIENDS.ADD.DESCRIPTION')} showConfirmButton={false}>
            <PeoplePicker onPick={person => void send(person.id, person.name)} />
        </Dialog>
    );
});

export default AddFriendDialog;
