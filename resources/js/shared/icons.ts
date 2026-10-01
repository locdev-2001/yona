// Phần lõi của bảng icon theo nghĩa, dùng chung cho mọi bề mặt (widget, portal,
// khảo sát, dashboard). Mọi bề mặt đều quét shared/, nên mỗi icon thêm vào đây đi
// theo vào CSS của cả widget nhúng trên site khách: chỉ đặt ở đây icon thật sự dùng
// ngoài dashboard. Dashboard mở rộng bảng này ở dashboard/icons.ts.
export const SHARED_ICONS = {
    search: 'i-lucide-search',
    close: 'i-lucide-x',
    chevronDown: 'i-lucide-chevron-down',
    arrowRight: 'i-lucide-arrow-right',
    globe: 'i-lucide-globe',
} as const;
