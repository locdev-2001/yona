<?php

namespace App\Channels;

/**
 * Định dạng chữ mà một kênh hiển thị được cho khách. Kênh tự khai trong
 * `capabilities()`; bộ soạn luôn lưu markdown, lõi chuyển sang định dạng này
 * lúc gửi ra kênh (App\Support\Messages\OutgoingText).
 */
enum TextFormat: string
{
    /** Kênh chỉ hiện chữ trơn: mọi cú pháp markdown phải bỏ. */
    case Plain = 'plain';

    /** Kênh tự hiển thị markdown (widget, API trả nguyên cho hệ thống bên ngoài). */
    case Markdown = 'markdown';

    /** Thân thư HTML. */
    case Html = 'html';

    /** Dấu nhấn riêng kiểu *đậm* _nghiêng_ ~gạch~. */
    case WhatsApp = 'whatsapp';

    /** Tập thẻ HTML hẹp `<b> <i> <s> <code> <pre> <a> <blockquote>`. */
    case TelegramHtml = 'telegram_html';
}
