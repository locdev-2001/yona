<?php

namespace App\Services\Zalo;

/**
 * Dòng thông báo hệ thống Zalo chèn vào khung chat (tạo nhắc hẹn, đổi tên nhóm…):
 * zca gửi như tin `webchat` nhưng nội dung là đối tượng có `action`
 * `msginfo.actionlist`. Đây là hoạt động của hội thoại, không phải lời khách nói.
 * Nguồn duy nhất của luật nhận diện — driver khi nhận tin và lệnh sửa dữ liệu cũ
 * cùng gọi.
 */
final class ZaloChatTip
{
    public const ACTION = 'msginfo.actionlist';

    /** @param  mixed  $zcaMessage  listener_data hoặc ảnh chụp content_attributes.zca_message */
    public static function matches(mixed $zcaMessage): bool
    {
        return is_array($zcaMessage)
            && is_array($zcaMessage['content'] ?? null)
            && ($zcaMessage['content']['action'] ?? null) === self::ACTION;
    }
}
