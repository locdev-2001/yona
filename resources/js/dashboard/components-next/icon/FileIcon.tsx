import Icon from './Icon';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components-next/icon/FileIcon.vue.
const FILE_TYPE_ICONS: Record<string, string> = {
    '7z': ICONS.fileArchive,
    csv: ICONS.fileSpreadsheet,
    doc: ICONS.fileDocument,
    docx: ICONS.fileDocument,
    json: ICONS.fileCode,
    odt: ICONS.fileDocument,
    pdf: ICONS.fileDocument,
    pfx: ICONS.fileCertificate,
    ppt: ICONS.filePresentation,
    pptx: ICONS.filePresentation,
    rar: ICONS.fileArchive,
    rtf: ICONS.fileDocument,
    tar: ICONS.fileArchive,
    txt: ICONS.fileText,
    xls: ICONS.fileSpreadsheet,
    xlsx: ICONS.fileSpreadsheet,
    xml: ICONS.fileCode,
    zip: ICONS.fileArchive,
};

interface FileIconProps {
    fileType: string;
    className?: string;
}

export default function FileIcon({ fileType, className }: FileIconProps) {
    return <Icon icon={FILE_TYPE_ICONS[fileType] || ICONS.file} className={className} />;
}
