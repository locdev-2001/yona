import { forwardRef } from 'react';
import { router, usePage } from '@inertiajs/react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import PeoplePicker from './PeoplePicker';

// Nhắn một người dùng Yona: tìm theo @username hoặc tên, chọn là mở hội thoại trong
// hộp thư Yona của mình.
const NewYonaChatDialog = forwardRef<DialogHandle>(function NewYonaChatDialog(_props, ref) {
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;

    const open = async (userId: number) => {
        try {
            const conversation = await postJson<{ id: number }>(`/api/v1/accounts/${accountId}/yona/conversations`, { user_id: userId });
            (ref as { current: DialogHandle | null } | null)?.current?.close();
            router.visit(conversationUrl({ accountId, id: conversation.id }));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PEOPLE.CHAT.OPEN_ERROR'));
        }
    };

    return (
        <Dialog ref={ref} title={t('CHAT.NEW.TITLE')} description={t('CHAT.NEW.DESCRIPTION')} showConfirmButton={false}>
            <PeoplePicker onPick={person => void open(person.id)} />
        </Dialog>
    );
});

export default NewYonaChatDialog;
