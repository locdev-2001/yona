import { forwardRef } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';

// Xoá cuộc trò chuyện khỏi danh sách của mình; người kia vẫn giữ và không được báo.
const DeleteChatDialog = forwardRef<DialogHandle>(function DeleteChatDialog(_props, ref) {
    const { removeConversation, conversationId } = useConversation();

    return (
        <Dialog
            ref={ref}
            type="alert"
            title={t('CHAT.DELETE.TITLE')}
            description={t('CHAT.DELETE.DESCRIPTION')}
            confirmButtonLabel={t('CHAT.DELETE.CONFIRM')}
            onConfirm={() => void removeConversation(conversationId)}
        />
    );
});

export default DeleteChatDialog;
