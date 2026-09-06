<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * Một contract = một năng lực trong docs/channel-capabilities.md §2, viết MỘT lần
 * và dùng lại cho mọi kênh. Phần đặc thù kênh (bơm fixture, gọi driver) do
 * ChannelHarness cung cấp; contract chỉ soi kết quả trong LÕI.
 *
 * Thêm kênh = viết harness, không sửa contract. Thêm năng lực = thêm contract,
 * không sửa kênh nào.
 */
abstract class ChannelContract
{
    abstract public static function capability(): Capability;

    abstract public function assert(ChannelHarness $harness): void;

    /**
     * Lõi tự gửi tin đi ngay khi tin được tạo (SendReplyJob, hàng đợi sync trong
     * test) nên tin đã mang `source_id` trước khi contract kịp gắn đính kèm hoặc
     * trích dẫn. Xoá dấu vết lần gửi đó để lần gọi driver của contract là tất định.
     */
    protected function readyToSend(Message $message): Message
    {
        $message->update(['source_id' => null]);

        return $message->fresh(['attachments']);
    }
}
