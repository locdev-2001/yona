// Payload của WidgetUpdatesController (WebApi) — khác payload công khai của
// widget (app/Http/Controllers/Widget/UpdatesController.php) ở chỗ có đủ body,
// inbox, trạng thái đăng cho màn quản trị.
export type WidgetUpdateTag = 'promo' | 'new' | 'notice';

export interface WidgetUpdateInbox {
    id: number;
    name: string;
}

export interface WidgetUpdate {
    id: number;
    title: string;
    body: string | null;
    tag: WidgetUpdateTag;
    cover_url: string | null;
    cta_label: string | null;
    cta_url: string | null;
    inbox: WidgetUpdateInbox | null;
    published: boolean;
    published_at: number | null;
}

// Nội dung form: chỉ phần người dùng chỉnh, không có id/published (đăng/gỡ
// đăng là hành động riêng — xem publishWidgetUpdate/unpublishWidgetUpdate).
export interface WidgetUpdateFormValues {
    title: string;
    body: string;
    tag: WidgetUpdateTag;
    coverUrl: string;
    ctaLabel: string;
    ctaUrl: string;
    inboxId: number | null;
}

export const WIDGET_UPDATE_TAGS: WidgetUpdateTag[] = ['promo', 'new', 'notice'];
