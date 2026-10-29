<?php

namespace App\Services\Channels;

use App\Models\ContactInbox;
use App\Models\Conversation;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Luật tìm/mở hội thoại cho mọi incoming message service (telegram/line/sms/twilio/tiktok…). Gom về một chỗ: đổi luật mở lại
 * hội thoại chỉ sửa ở đây.
 *
 * Nhiều worker nhận tin dồn của cùng một contact_inbox cùng lúc thì chỉ một worker được tìm-rồi-tạo; worker sau chờ khoá rồi
 * thấy hội thoại worker trước vừa tạo. Khoá nhả khi hội thoại mới đã commit (gọi trong transaction thì đợi transaction ngoài
 * commit hoặc rollback), để worker sau không đọc hụt dòng chưa commit.
 */
class IncomingConversationResolver
{
    private const LOCK_SECONDS = 30;

    private const LOCK_WAIT_SECONDS = 10;

    /**
     * @param  array<string, mixed>  $additionalAttributes
     * @param  bool  $awaitsAcceptance  hội thoại mới mở ra ở trạng thái chờ; hội thoại đang mở thì giữ nguyên
     */
    public static function resolve(ContactInbox $contactInbox, array $additionalAttributes = [], bool $awaitsAcceptance = false): Conversation
    {
        $lock = Cache::lock('incoming-conversation:contact-inbox:'.$contactInbox->id, self::LOCK_SECONDS);
        $lock->block(self::LOCK_WAIT_SECONDS);

        try {
            return self::findReusableConversation($contactInbox)
                ?? self::createConversation($contactInbox, $additionalAttributes, $awaitsAcceptance);
        } finally {
            self::releaseOnceCommitted($lock);
        }
    }

    /** Mỗi người là một hội thoại liền mạch như app chat: tin mới vào hội thoại gần nhất, đã xong thì tự mở lại. */
    private static function findReusableConversation(ContactInbox $contactInbox): ?Conversation
    {
        return $contactInbox->conversations()->latest('id')->first();
    }

    /** @param array<string, mixed> $additionalAttributes */
    private static function createConversation(ContactInbox $contactInbox, array $additionalAttributes, bool $awaitsAcceptance): Conversation
    {
        return Conversation::query()->create([
            'account_id' => $contactInbox->inbox->account_id,
            'inbox_id' => $contactInbox->inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
            'additional_attributes' => $additionalAttributes,
            ...($awaitsAcceptance ? ['status' => Conversation::STATUS_PENDING] : []),
        ]);
    }

    private static function releaseOnceCommitted(Lock $lock): void
    {
        $connection = DB::connection((new Conversation)->getConnectionName());
        $release = fn () => $lock->release();

        $connection->afterRollBack($release);
        $connection->afterCommit($release);
    }
}
