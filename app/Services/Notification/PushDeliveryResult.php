<?php

namespace App\Services\Notification;

// Kết quả một lần đẩy tới push service, tách khỏi thư viện Web Push để lõi thông
// báo chỉ quyết định việc của mình: đăng ký đã chết thì xoá.
enum PushDeliveryResult
{
    case Delivered;
    case SubscriptionGone;
    case Failed;
}
