<?php

namespace App\Services\Mailbox\Strategies;

use App\Models\Conversation;

// Chiến lược 1 — địa chỉ nhận dạng `reply+<conversation-uuid>@domain`.
class ReceiverUuidStrategy extends BaseStrategy
{
    public const UUID_PATTERN = '/^reply\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i';

    public function find(): ?Conversation
    {
        $uuid = $this->extractUuidFromReceivers();

        return $uuid === null ? null : Conversation::query()->where('uuid', $uuid)->first();
    }

    private function extractUuidFromReceivers(): ?string
    {
        foreach ($this->mail->mailReceiver() as $email) {
            $username = explode('@', $email)[0];

            if (preg_match(self::UUID_PATTERN, $username, $matches) === 1) {
                return $matches[1];
            }
        }

        return null;
    }
}
