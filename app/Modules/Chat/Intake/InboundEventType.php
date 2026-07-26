<?php

namespace App\Modules\Chat\Intake;

/**
 * DANH TÍNH của một sự kiện đi VÀO — chuỗi ổn định, lưu DB và đưa lên API.
 *
 * Đi cặp với `InboundEvent` (payload) theo luật đối xứng §0.6, cùng khuôn
 * `OutboundEvent`↔`OutboundEventType`.
 *
 * Tên class KHÔNG phải định dạng lưu trữ: đổi tên `MessageArrived` thoải mái,
 * nhưng đổi chuỗi `'message_arrived'` là phá mọi hàng đã lưu và mọi client đã
 * tích hợp.
 */
enum InboundEventType: string
{
    case MessageArrived = 'message_arrived';
    case ReactionPlaced = 'reaction_placed';
    case MessageSeen = 'message_seen';
    case MessageDelivered = 'message_delivered';
    case MessageRecalled = 'message_recalled';

    /** Khách bấm nút / gửi ô nhập — KHÔNG phải tin chữ giả lập. */
    case ActionSubmitted = 'action_submitted';

    case SenderJoined = 'sender_joined';
    case SenderLeft = 'sender_left';

    /** Nhà cung cấp phát ra thứ ta chưa biết — cách ly, không đoán bừa. */
    case Unrecognized = 'unrecognized';
}
