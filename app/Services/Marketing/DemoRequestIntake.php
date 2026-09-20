<?php

namespace App\Services\Marketing;

use App\Builders\ContactInboxWithContactBuilder;
use App\Builders\ConversationBuilder;
use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use App\Models\Inbox;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Lead từ trang đặt lịch demo đổ vào chính hộp thư của Yona.
 *
 * Không có bảng `leads` riêng: lead là một hội thoại đến trong hộp thư kênh API,
 * đi đúng đường mà tin khách đi (ContactInbox -> Conversation -> Message). Đội
 * trực thấy nó cạnh tin khách thật, tính năng gán việc và nhãn dùng được ngay,
 * và sản phẩm tự chứng minh là nó dùng được cho chính mình.
 *
 * Khoá chống trùng là SỐ ĐIỆN THOẠI (quy tắc 1): một người gửi form hai lần
 * không thành hai hồ sơ, vì `source_id` của contact inbox chính là số đã chuẩn
 * hoá và builder tra `phone_number` trước khi tạo contact mới.
 *
 * KHÔNG gắn nhãn hội thoại: Labelable chỉ gắn được nhãn đã tồn tại trong account
 * và bỏ qua title lạ mà không báo gì, nên `addLabels` ở đây là một no-op im lặng.
 * Hộp thư nhận lead là hộp thư riêng, nó đã phân loại rồi; nguồn còn ghi trong
 * `additional_attributes.source` của cả contact và hội thoại.
 */
final class DemoRequestIntake
{
    public function record(string $name, string $phoneE164, ?string $note, string $sourcePage): Conversation
    {
        $inbox = $this->inbox();

        return DB::transaction(function () use ($inbox, $name, $phoneE164, $note, $sourcePage) {
            $contactInbox = (new ContactInboxWithContactBuilder(
                inbox: $inbox,
                contactAttributes: [
                    'name' => $name,
                    'phone_number' => $phoneE164,
                    'additional_attributes' => ['source' => $sourcePage],
                ],
                sourceId: $phoneE164,
            ))->perform();

            if ($contactInbox === null) {
                throw new RuntimeException('Không dựng được contact inbox cho lead đặt lịch demo.');
            }

            $conversation = (new ConversationBuilder(
                params: ['additional_attributes' => ['source' => $sourcePage]],
                contactInbox: $contactInbox,
            ))->perform();

            (new MessageBuilder(
                user: null,
                conversation: $conversation,
                params: [
                    'content' => $this->content($name, $phoneE164, $note),
                    'message_type' => 'incoming',
                ],
                incomingAllowed: true,
            ))->perform();

            return $conversation;
        });
    }

    private function inbox(): Inbox
    {
        $inboxId = config('yona.marketing.lead_inbox_id');

        if ($inboxId === null) {
            throw new RuntimeException('Chưa cấu hình YONA_LEAD_INBOX_ID nên lead không có chỗ để rơi vào.');
        }

        $inbox = Inbox::query()->find($inboxId);

        if ($inbox === null) {
            throw new RuntimeException("Hộp thư nhận lead #{$inboxId} không tồn tại.");
        }

        return $inbox;
    }

    private function content(string $name, string $phoneE164, ?string $note): string
    {
        $lines = [
            'Yêu cầu đặt lịch demo từ trang công khai.',
            '',
            "Tên: {$name}",
            "Số điện thoại: {$phoneE164}",
        ];

        if (filled($note)) {
            $lines[] = '';
            $lines[] = 'Khách viết thêm:';
            $lines[] = $note;
        }

        return implode("\n", $lines);
    }
}
