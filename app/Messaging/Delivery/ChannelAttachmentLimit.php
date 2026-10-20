<?php

namespace App\Messaging\Delivery;

use App\Exceptions\MessageValidationException;
use App\Models\Attachment;
use App\Models\Inbox;

/**
 * Kênh khai trần tệp riêng (vd Zalo) thì chặn ngay lúc gắn tệp vào tin, không để tin
 * đi tới kênh rồi mới hỏng mà người gửi không biết. Một chỗ cho mọi đường gắn tệp.
 */
final class ChannelAttachmentLimit
{
    /** @throws MessageValidationException */
    public static function assertFits(Inbox $inbox, Attachment $attachment): void
    {
        $limit = $inbox->capabilities()->maxAttachmentBytes();

        if ($limit === null || (int) $attachment->byte_size <= $limit) {
            return;
        }

        $megabytes = intdiv($limit, 1024 * 1024);
        $name = $attachment->filename ?: 'tệp';

        throw new MessageValidationException("Tệp \"{$name}\" vượt quá {$megabytes} MB, kênh này không gửi được. Hãy nén hoặc chia nhỏ tệp rồi gửi lại.");
    }
}
