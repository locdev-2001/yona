import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { openProfile } from 'dashboard/contacts/profile/profileOverlay';
import PeoplePicker from 'shared/people/PeoplePicker';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { ensureYonaContact } from './api';

const REOPEN_ESC_GRACE_MS = 500;

interface FindPeopleDialogProps {
    title: string;
    description: string;
}

// Tìm người dùng Yona theo @username hoặc tên. Chọn một người là mở hồ sơ (nhắn tin, kết
// bạn đều làm từ hồ sơ); đóng hồ sơ thì hộp tìm hiện lại với chữ đang tìm. Hộp chỉ tắt
// bằng Esc hoặc Huỷ, bấm nền mờ không tắt.
const FindPeopleDialog = forwardRef<DialogHandle, FindPeopleDialogProps>(function FindPeopleDialog({ title, description }, ref) {
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;
    const dialogRef = useRef<DialogHandle>(null);
    const [query, setQuery] = useState('');
    // Đang tạm ẩn hộp để hồ sơ hiện lên (hộp <dialog> luôn nằm trên mọi lớp khác).
    const isShowingProfile = useRef(false);
    const reopenedAt = useRef(0);

    useImperativeHandle(ref, () => ({
        open: () => dialogRef.current?.open(),
        close: () => dialogRef.current?.close(),
    }));

    const viewProfile = async (userId: number) => {
        try {
            const contactId = await ensureYonaContact(accountId, userId);
            isShowingProfile.current = true;
            dialogRef.current?.close();
            openProfile(contactId, {
                onDismiss: () => {
                    isShowingProfile.current = false;
                    reopenedAt.current = Date.now();
                    dialogRef.current?.open();
                },
            });
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FRIENDS.REQUESTS.ERROR'));
        }
    };

    return (
        <Dialog
            ref={dialogRef}
            title={title}
            description={description}
            showConfirmButton={false}
            closeOnBackdrop={false}
            // Phím Esc vừa đóng hồ sơ cũng tới hộp vừa hiện lại: bỏ qua lần đó.
            onCancel={event => {
                if (Date.now() - reopenedAt.current < REOPEN_ESC_GRACE_MS) event.preventDefault();
            }}
            onClose={() => {
                if (!isShowingProfile.current) setQuery('');
            }}
        >
            <PeoplePicker query={query} onQueryChange={setQuery} onPick={person => void viewProfile(person.id)} />
        </Dialog>
    );
});

export default FindPeopleDialog;
