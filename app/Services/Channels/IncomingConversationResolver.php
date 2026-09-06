<?php

namespace App\Services\Channels;

use App\Models\ContactInbox;
use App\Models\Conversation;

/**
 * Khối `set_conversation` lặp nguyên văn trong mọi incoming message service của
 * Chatwoot (telegram/line/sms/twilio/tiktok…). Gom về một chỗ: đổi luật mở lại
 * hội thoại chỉ sửa ở đây.
 */
class IncomingConversationResolver
{
    /** @param array<string, mixed> $additionalAttributes */
    public static function resolve(ContactInbox $contactInbox, array $additionalAttributes = []): Conversation
    {
        $inbox = $contactInbox->inbox;

        $conversation = $inbox->lock_to_single_conversation
            ? $contactInbox->conversations()->latest('id')->first()
            : $contactInbox->conversations()->where('status', '!=', Conversation::STATUS_RESOLVED)->latest('id')->first();

        if ($conversation !== null) {
            return $conversation;
        }

        return Conversation::query()->create([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
            'additional_attributes' => $additionalAttributes,
        ]);
    }
}
