import { t } from '../../../../i18n';
import BaseAttachmentBubble from './BaseAttachment';
import { useMessageContext } from '../provider';

// Năng lực `friend_request` (docs/channel-capabilities.md §2.4): lời mời kết bạn
// / lượt theo dõi từ một kênh bất kỳ. Bong bóng đọc khoá chuẩn hoá
// content_attributes.friend_request, KHÔNG đọc channel_type — kênh nào khai năng
// lực này cũng dùng đúng bong bóng này.

export interface FriendRequestAttributes {
    external_id?: string | null;
    message?: string | null;
}

export default function FriendRequestBubble() {
    const { contentAttributes } = useMessageContext();
    const request = (contentAttributes.friend_request ?? {}) as FriendRequestAttributes;

    return (
        <BaseAttachmentBubble
            icon="i-lucide-user-plus"
            iconBgColor="bg-n-solid-blue"
            senderTranslationKey="CONVERSATION.SHARED_ATTACHMENT.FRIEND_REQUEST"
            title={t('CONVERSATION.FRIEND_REQUEST.TITLE')}
            content={request.message?.trim() ?? ''}
            action={null}
        />
    );
}
