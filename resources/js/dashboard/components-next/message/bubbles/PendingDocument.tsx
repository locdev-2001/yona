import LoaderIcon from 'shared/components/loader/LoaderIcon';

import { t } from '../../../../i18n';
import { MESSAGE_STATUS } from '../constants';
import FileCard from '../chips/FileCard';
import { useMessageContext } from '../provider';
import BaseBubble from './Base';

const PDF_EXTENSION = 'pdf';

// Tệp của tin đang được dựng ở worker (`content_attributes.pending_document`): hiện ngay
// thẻ tệp với tên sẽ gửi, dựng xong thì realtime thay bằng tệp thật.
export default function PendingDocumentBubble() {
    const { contentAttributes, status } = useMessageContext();
    const pending = contentAttributes.pending_document as { filename?: unknown } | undefined;
    const fileName = typeof pending?.filename === 'string' ? pending.filename : `email.${PDF_EXTENSION}`;
    const label = t('CONVERSATION.FORWARDED.PREPARING_DOCUMENT');

    return (
        <BaseBubble className="p-1.5" dataBubbleName="pending-document">
            <FileCard
                fileName={fileName}
                extension={PDF_EXTENSION}
                action={
                    status === MESSAGE_STATUS.FAILED ? null : (
                        <span className="grid shrink-0 size-8 place-content-center text-n-slate-11" title={label}>
                            <LoaderIcon size={20} label={label} />
                        </span>
                    )
                }
            />
        </BaseBubble>
    );
}
