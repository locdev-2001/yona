<?php

namespace App\Services\Mailbox\Strategies;

use App\Finders\EmailChannelFinder;
use App\Models\Channel\Email;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Email\MailPresenter;

// Chiến lược 3 — header References; truy vấn bó vào đúng inbox của kênh nhận
// để không nối nhầm hội thoại của tài khoản khác.
class ReferencesStrategy extends BaseStrategy
{
    private readonly ?Email $channel;

    public function __construct(MailPresenter $mail)
    {
        parent::__construct($mail);

        $this->channel = (new EmailChannelFinder($mail))->perform();
    }

    public function find(): ?Conversation
    {
        if ($this->channel === null) {
            return null;
        }

        foreach ($this->mail->references() as $reference) {
            $conversation = $this->conversationFromReference($reference);

            if ($conversation !== null) {
                return $conversation;
            }
        }

        return null;
    }

    private function conversationFromReference(string $reference): ?Conversation
    {
        $inboxId = $this->channel->inbox->id;
        $uuid = $this->extractUuidFromPatterns($reference);

        if ($uuid !== null) {
            $conversation = Conversation::query()->where('uuid', $uuid)->where('inbox_id', $inboxId)->first();

            if ($conversation !== null) {
                return $conversation;
            }
        }

        return Message::query()->where('source_id', $reference)->where('inbox_id', $inboxId)->first()?->conversation;
    }
}
