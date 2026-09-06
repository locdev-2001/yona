// Port từ shared/constants/messages.js (phần đính kèm ReplyBox + khảo sát CSAT).
export const ALLOWED_FILE_TYPES =
    'image/*,' +
    'audio/*,' +
    'video/*,' +
    '.3gpp,' +
    '.xls, .xlsx, .xml, .pfx,' +
    'text/csv, text/plain, application/json, application/pdf, text/rtf,' +
    'application/xml, text/xml,' +
    'application/zip, application/x-7z-compressed application/vnd.rar application/x-tar,' +
    'application/msword, application/vnd.ms-excel, application/vnd.ms-powerpoint, application/vnd.oasis.opendocument.text,' +
    'application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
    'application/x-pkcs12, application/pkcs12,';

export interface CsatRating {
    key: string;
    translationKey: string;
    emoji: string;
    value: number;
    color: string;
}

export const CSAT_RATINGS: CsatRating[] = [
    { key: 'disappointed', translationKey: 'CSAT.RATINGS.POOR', emoji: '😞', value: 1, color: '#FDAD2A' },
    { key: 'expressionless', translationKey: 'CSAT.RATINGS.FAIR', emoji: '😑', value: 2, color: '#FFC532' },
    { key: 'neutral', translationKey: 'CSAT.RATINGS.AVERAGE', emoji: '😐', value: 3, color: '#FCEC56' },
    { key: 'grinning', translationKey: 'CSAT.RATINGS.GOOD', emoji: '😀', value: 4, color: '#6FD86F' },
    { key: 'smiling', translationKey: 'CSAT.RATINGS.EXCELLENT', emoji: '😍', value: 5, color: '#44CE4B' },
];

export const CSAT_DISPLAY_TYPES = {
    EMOJI: 'emoji',
    STAR: 'star',
} as const;
