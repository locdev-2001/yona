import { createPortal } from 'react-dom';

import GalleryView from 'dashboard/components/widgets/conversation/components/GalleryView';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';

interface AvatarPreviewProps {
    src: string;
    name: string;
    onClose: () => void;
}

/**
 * Ảnh đại diện mở bằng chính trình xem ảnh của tin nhắn: một ảnh, tên chủ ảnh ở
 * đầu, không tên tệp. Gắn vào body để thoát ngữ cảnh xếp lớp của avatar; sự kiện
 * không lan lên cha của avatar (thẻ hội thoại, dòng liên hệ) theo cây React.
 */
export default function AvatarPreview({ src, name, onClose }: AvatarPreviewProps) {
    const avatarImage: MessageAttachment = {
        id: 0,
        file_type: 'image',
        data_url: src,
        filename: '',
        sender: { name, thumbnail: src },
    };

    return createPortal(
        <div onClick={event => event.stopPropagation()}>
            <GalleryView attachment={avatarImage} allAttachments={[avatarImage]} onClose={onClose} />
        </div>,
        document.body,
    );
}
