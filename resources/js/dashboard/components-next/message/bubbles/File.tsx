import FileIcon from 'dashboard/components-next/icon/FileIcon';

import { t } from '../../../../i18n';
import BaseAttachmentBubble from './BaseAttachment';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/File.vue.
export default function FileBubble() {
    const { attachments } = useMessageContext();
    const url = attachments[0]?.data_url ?? '';

    const fileName = url ? url.substring(url.lastIndexOf('/') + 1) || t('CONVERSATION.UNKNOWN_FILE_TYPE') : t('CONVERSATION.UNKNOWN_FILE_TYPE');
    const fileType = fileName.split('.').pop() ?? '';

    return (
        <BaseAttachmentBubble
            icon="i-teenyicons-user-circle-solid"
            iconBgColor="bg-n-alpha-3 dark:bg-n-alpha-white"
            senderTranslationKey="CONVERSATION.SHARED_ATTACHMENT.FILE"
            content={decodeURI(fileName)}
            action={{ href: url, label: t('CONVERSATION.DOWNLOAD') }}
            iconSlot={<FileIcon fileType={fileType} className="size-4" />}
        />
    );
}
