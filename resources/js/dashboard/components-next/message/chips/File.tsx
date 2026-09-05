import { getFileInfo } from '@chatwoot/utils';

import FileIcon from 'dashboard/components-next/icon/FileIcon';
import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import type { MessageAttachment } from '../helpers/attachments';

// Port từ dashboard/components-next/message/chips/File.vue.
const TEXT_COLOR_BY_TYPE: Record<string, string> = {
    '7z': 'dark:text-[#EDEEF0] text-[#2F265F]',
    csv: 'text-n-amber-12',
    doc: 'dark:text-[#D6E1FF] text-[#1F2D5C]',
    docx: 'dark:text-[#D6E1FF] text-[#1F2D5C]',
    json: 'text-n-slate-12',
    odt: 'dark:text-[#D6E1FF] text-[#1F2D5C]',
    pdf: 'text-n-slate-12',
    ppt: 'dark:text-[#FFE0C2] text-[#582D1D]',
    pptx: 'dark:text-[#FFE0C2] text-[#582D1D]',
    rar: 'dark:text-[#EDEEF0] text-[#2F265F]',
    rtf: 'dark:text-[#D6E1FF] text-[#1F2D5C]',
    tar: 'dark:text-[#EDEEF0] text-[#2F265F]',
    txt: 'text-n-slate-12',
    xls: 'text-n-teal-12',
    xlsx: 'text-n-teal-12',
    zip: 'dark:text-[#EDEEF0] text-[#2F265F]',
};

const truncatedName = (value: string, maxLength: number, hasExtension: boolean): string =>
    value.length > maxLength
        ? `${value.substring(0, maxLength).trimEnd()}${hasExtension ? '..' : '...'}`
        : value;

export default function FileChip({ attachment }: { attachment: MessageAttachment }) {
    const fileDetails = getFileInfo(attachment.data_url ?? '');
    const displayFileName = fileDetails.type
        ? `${truncatedName(fileDetails.base, 12, true)}.${fileDetails.type}`
        : truncatedName(fileDetails.base, 14, false);

    return (
        <div className="h-9 bg-n-alpha-white gap-2 overflow-hidden items-center flex px-2 rounded-lg border border-n-container">
            <FileIcon className="flex-shrink-0" fileType={fileDetails.type} />
            <span
                className={`flex-1 min-w-0 text-sm max-w-36 ${TEXT_COLOR_BY_TYPE[fileDetails.type] || 'text-n-slate-12'}`}
                title={fileDetails.name}
            >
                {displayFileName}
            </span>
            <a
                title={t('CONVERSATION.DOWNLOAD')}
                className="flex-shrink-0 size-9 grid place-content-center cursor-pointer text-n-slate-11 hover:text-n-slate-12 transition-colors"
                href={attachment.data_url ?? ''}
                rel="noreferrer noopener nofollow"
                target="_blank"
            >
                <Icon icon="i-lucide-download" />
            </a>
        </div>
    );
}
