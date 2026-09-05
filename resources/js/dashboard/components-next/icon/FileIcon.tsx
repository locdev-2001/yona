import Icon from './Icon';

// Port từ dashboard/components-next/icon/FileIcon.vue.
const FILE_TYPE_ICONS: Record<string, string> = {
    '7z': 'i-woot-file-zip',
    csv: 'i-woot-file-csv',
    doc: 'i-woot-file-doc',
    docx: 'i-woot-file-doc',
    json: 'i-woot-file-txt',
    odt: 'i-woot-file-doc',
    pdf: 'i-woot-file-pdf',
    pfx: 'i-woot-file-pfx',
    ppt: 'i-woot-file-ppt',
    pptx: 'i-woot-file-ppt',
    rar: 'i-woot-file-zip',
    rtf: 'i-woot-file-doc',
    tar: 'i-woot-file-zip',
    txt: 'i-woot-file-txt',
    xls: 'i-woot-file-xls',
    xlsx: 'i-woot-file-xls',
    xml: 'i-woot-file-txt',
    zip: 'i-woot-file-zip',
};

interface FileIconProps {
    fileType: string;
    className?: string;
}

export default function FileIcon({ fileType, className }: FileIconProps) {
    return <Icon icon={FILE_TYPE_ICONS[fileType] || 'i-teenyicons-text-document-solid'} className={className} />;
}
