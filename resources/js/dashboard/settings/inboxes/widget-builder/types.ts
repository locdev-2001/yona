import type { WidgetSettingsShape } from '../types';

/** Thứ tự cũng là thứ tự cột nav trái và các thẻ trong cột giữa (điều hướng kiểu cuộn-tới-neo). */
export const WIDGET_BUILDER_SECTIONS = [
    'appearance',
    'home',
    'channels',
    'capture',
    'invite',
    'ai',
    'embed',
] as const;

export type WidgetBuilderSectionId = (typeof WIDGET_BUILDER_SECTIONS)[number];

/**
 * Bản nháp màn Widget chat sửa: một state, một nút "Lưu thay đổi" gửi đúng một
 * PATCH gồm các phần này (App\Http\Controllers\WebApi\InboxesController::update).
 * `name`/`welcomeTagline` không có ô sửa riêng ở các thẻ hiện có, nhưng vẫn nằm
 * trong bản nháp để PATCH không vô tình xoá giá trị đang lưu.
 */
export interface WidgetDraft {
    name: string;
    widgetColor: string;
    welcomeTagline: string;
    widgetSettings: WidgetSettingsShape;
    /** Tên miền được nhúng widget, phân cách bằng dấu phẩy (đã chuẩn hoá). */
    allowedDomains: string;
}

/** Lỗi 422 của WidgetSettings::normalize, khoá phẳng kiểu `other_channels.0` / `custom_links.0`. */
export type WidgetBuilderFieldErrors = Record<string, string>;

export type PreviewDevice = 'desktop' | 'mobile';
