import type { BrandingConfig } from 'shared/components/Branding';

// Trang khảo sát công khai nhận cấu hình cài đặt qua `window.globalConfig` do
// blade nhúng sẵn (giống survey/responses/show.html.erb của bản gốc) — không có
// API `/config` như widget.
export const surveyGlobalConfig = (): BrandingConfig =>
    (window as { globalConfig?: BrandingConfig }).globalConfig ?? {};
