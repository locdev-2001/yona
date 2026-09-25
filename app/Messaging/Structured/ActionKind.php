<?php

namespace App\Messaging\Structured;

/** Việc một nút trên thẻ làm. Widget thực thi, kênh khác hạ cấp; payload chỉ khai báo. */
enum ActionKind: string
{
    /** Trả lời bằng một lựa chọn — map về `choices()`. */
    case Reply = 'reply';
    case Link = 'link';
    /** Mở trang công khai của Yona (form dài, chọn lịch…). */
    case Webview = 'webview';
    /** Mở sheet chọn biến thể rồi gửi yêu cầu đặt hàng. */
    case Order = 'order';
    case Copy = 'copy';
    case Call = 'call';
    /** Đẩy payload ra trang nhúng qua SDK (hành vi thẻ đời cũ). */
    case Postback = 'postback';
}
