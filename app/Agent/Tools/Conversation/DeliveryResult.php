<?php

namespace App\Agent\Tools\Conversation;

use App\Agent\ValueObjects\DeliveryFailure;
use App\Agent\ValueObjects\DeliveryReceipt;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolResult;

// Biên nhận ghi vào hội thoại → tool_result mô hình đọc: một chỗ cho mọi công cụ gửi tin
// và ghi chú. Lượt mất quyền hay cửa sổ kênh đóng thì vòng lượt tự dừng ở bước kế tiếp;
// ở đây chỉ nói rõ là chưa gửi được để mô hình không nói như đã gửi.
final class DeliveryResult
{
    /** @param array<string, mixed> $sent */
    public static function of(DeliveryReceipt $receipt, array $sent, ?string $hint = null, ?string $notFoundFix = null, ?string $notPermittedFix = null): ToolResult
    {
        return match ($receipt->failure) {
            null => ToolResult::success(['sent' => true, ...$sent], $hint),
            DeliveryFailure::WindowClosed => ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, 'Not sent: the channel no longer accepts messages from the shop right now.'),
            DeliveryFailure::FloorLost, DeliveryFailure::AutoResponderOff => ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, 'Not sent: you no longer handle this conversation; stop here.'),
            DeliveryFailure::NotFound => ToolResult::failure(ToolErrorCode::UnknownRef, $notFoundFix ?? 'Not sent: something it refers to does not exist.'),
            DeliveryFailure::NotPermitted => ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, $notPermittedFix ?? 'Not sent: the shop does not allow you to do this; use handoff_to_human.'),
            DeliveryFailure::Rejected => ToolResult::failure(ToolErrorCode::ChannelUnsupported, 'Not sent: the message was rejected. Say it in words with reply, or use handoff_to_human.'),
        };
    }
}
