<?php

namespace App\Services\Messaging;

use App\Models\Inbox;
use App\Models\Message;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Biên nhận "đã giao" / "đã xem" của mọi kênh. Kênh chỉ bóc payload của mình ra
 * danh sách source_id hoặc một mốc thời gian rồi gọi vào đây.
 *
 * Chỉ áp cho tin ĐI (tin đến không có tick) và chỉ NÂNG trạng thái: biên nhận đến
 * trễ hoặc lặp không được kéo tick lùi. Mất một biên nhận không mất nghiệp vụ nên
 * chỉ cập nhật những tin tìm được. Cập nhật qua model để hook `updated` phát
 * `message.updated` cho realtime.
 */
class MessageReceiptService
{
    public const DELIVERED = 'delivered';

    public const READ = 'read';

    private const UPGRADABLE_STATUSES = [Message::STATUSES['sent'], Message::STATUSES['delivered']];

    /** @param list<string|null> $sourceIds */
    public function applyToSourceIds(Inbox $inbox, array $sourceIds, string $receipt): int
    {
        $sourceIds = array_values(array_filter($sourceIds));

        if ($sourceIds === []) {
            return 0;
        }

        return $this->upgrade(
            $this->outgoing($inbox)->whereIn('source_id', $sourceIds),
            $receipt,
        );
    }

    /** Kênh báo theo mốc (Messenger `watermark`): mọi tin đi tới người đó gửi trước mốc. */
    public function applyUpTo(Inbox $inbox, string $contactSourceId, CarbonInterface $watermark, string $receipt): int
    {
        return $this->upgrade(
            $this->outgoing($inbox)
                ->whereHas('conversation.contactInbox', fn (Builder $query) => $query->where('source_id', $contactSourceId))
                ->where('created_at', '<=', $watermark),
            $receipt,
        );
    }

    /** @return Builder<Message> */
    private function outgoing(Inbox $inbox): Builder
    {
        return Message::query()
            ->where('inbox_id', $inbox->id)
            ->where('message_type', Message::TYPE_OUTGOING);
    }

    /** @param Builder<Message> $query */
    private function upgrade(Builder $query, string $receipt): int
    {
        $status = Message::STATUSES[$receipt];

        $messages = $query
            ->whereIn('status', self::UPGRADABLE_STATUSES)
            ->where('status', '<', $status)
            ->get();

        foreach ($messages as $message) {
            $message->update(['status' => $status]);
        }

        return $messages->count();
    }
}
