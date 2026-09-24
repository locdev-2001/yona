import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import { attachmentExtension, attachmentFileName } from '../helpers/attachments';
import type { MessageAttachment } from '../helpers/attachments';
import FileCard from './FileCard';

export default function FileChip({ attachment }: { attachment: MessageAttachment }) {
    return (
        <FileCard
            fileName={attachmentFileName(attachment) || t('CONVERSATION.UNKNOWN_FILE_TYPE')}
            extension={attachmentExtension(attachment)}
            fileSize={attachment.file_size}
            action={
                <a
                    title={t('CONVERSATION.DOWNLOAD')}
                    aria-label={t('CONVERSATION.DOWNLOAD')}
                    className="grid shrink-0 size-8 place-content-center rounded-md cursor-pointer text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2 transition-colors"
                    href={attachment.data_url ?? ''}
                    download
                    rel="noreferrer noopener nofollow"
                    target="_blank"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Icon icon="i-lucide-download" />
                </a>
            }
        />
    );
}
