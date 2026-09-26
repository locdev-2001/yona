// Trang công khai không có cấu hình sáng/tối riêng như widget (không phiên,
// không cài đặt) — theo thẳng chế độ hệ điều hành, khớp token `.dark .mk` của
// message kit (shared/messaging/kit/kit.css).
export const prefersDarkMode = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
