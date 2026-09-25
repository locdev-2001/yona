<?php

use App\Messaging\Structured\Types\ArticleType;
use App\Messaging\Structured\Types\ButtonsType;
use App\Messaging\Structured\Types\CardsType;
use App\Messaging\Structured\Types\FormType;
use App\Messaging\Structured\Types\OrderRequestType;
use App\Messaging\Structured\Types\OrderStatusType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Messaging\Structured\Types\WebviewType;

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
    ],
];
