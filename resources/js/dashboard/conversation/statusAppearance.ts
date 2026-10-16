// Màu chấm trạng thái hội thoại, dùng chung cho thẻ danh sách và nút trạng thái ở mũ khung chat.
export const STATUS_DOT_COLOR: Record<string, string> = {
    open: 'bg-n-teal-10',
    pending: 'bg-n-amber-10',
    snoozed: 'bg-n-slate-9',
    resolved: 'bg-n-slate-9',
};

export const statusDotColor = (status: string | undefined): string => STATUS_DOT_COLOR[status ?? ''] ?? 'bg-n-slate-9';
