<?php

use App\Messaging\Delivery\Renderers\FacebookRenderer;
use App\Messaging\Delivery\Renderers\LineRenderer;
use App\Messaging\Delivery\Renderers\TelegramRenderer;
use App\Messaging\Structured\Types\ArticleType;
use App\Messaging\Structured\Types\BankTransferType;
use App\Messaging\Structured\Types\ButtonsType;
use App\Messaging\Structured\Types\CardsType;
use App\Messaging\Structured\Types\FormType;
use App\Messaging\Structured\Types\OrderRequestType;
use App\Messaging\Structured\Types\OrderStatusType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Messaging\Structured\Types\WebviewType;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Line;
use App\Models\Channel\Telegram;

return [
    /*
    | Các loại tin có cấu trúc. Thêm loại mới: một class hiện thực
    | App\Messaging\Structured\StructuredType + một dòng ở đây (+ tên trong
    | Message::CONTENT_TYPES nếu là loại mới hẳn). Không sửa lõi.
    */
    'structured_types' => [
        QuickRepliesType::class,
        ButtonsType::class,
        CardsType::class,
        ArticleType::class,
        FormType::class,
        WebviewType::class,
        OrderStatusType::class,
        OrderRequestType::class,
        BankTransferType::class,
    ],

    /*
    | Renderer gốc theo kênh cho DeliveryPlanner (App\Messaging\Delivery). Khoá
    | bằng class kênh: dù nhiều kênh cùng khai một capability (vd
    | outbound_quick_reply), mỗi kênh vẫn có payload riêng. Thêm kênh mới có
    | payload gốc: một class hiện thực NativeRenderer + một dòng ở đây.
    */
    'delivery_renderers' => [
        FacebookPage::class => FacebookRenderer::class,
        Telegram::class => TelegramRenderer::class,
        Line::class => LineRenderer::class,
    ],

    /*
    | Biểu cảm khách được thả trên widget, đúng thứ tự thanh chọn. Máy chủ chỉ
    | nhận emoji trong danh sách này; widget đọc qua cấu hình kênh.
    */
    'widget_reactions' => ['👍', '❤️', '😆', '😮', '😢', '🙏'],
];
