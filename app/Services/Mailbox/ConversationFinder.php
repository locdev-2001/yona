<?php

namespace App\Services\Mailbox;

use App\Models\Conversation;
use App\Services\Email\MailPresenter;
use App\Services\Mailbox\Strategies\BaseStrategy;
use App\Services\Mailbox\Strategies\InReplyToStrategy;
use App\Services\Mailbox\Strategies\NewConversationStrategy;
use App\Services\Mailbox\Strategies\ReceiverUuidStrategy;
use App\Services\Mailbox\Strategies\ReferencesStrategy;
use Illuminate\Support\Facades\Log;

/**
 * Port từ refs/chatwoot/app/services/mailbox/conversation_finder.rb — bốn chiến
 * lược nối thư vào hội thoại, chạy theo đúng thứ tự; chiến lược cuối luôn dựng
 * hội thoại mới nên chuỗi này chỉ trả null khi thư không thuộc kênh nào.
 */
class ConversationFinder
{
    /** @var list<class-string<BaseStrategy>> */
    public const DEFAULT_STRATEGIES = [
        ReceiverUuidStrategy::class,
        InReplyToStrategy::class,
        ReferencesStrategy::class,
        NewConversationStrategy::class,
    ];

    /** @param list<class-string<BaseStrategy>> $strategies */
    public function __construct(
        private readonly MailPresenter $mail,
        private readonly array $strategies = self::DEFAULT_STRATEGIES,
    ) {}

    public function find(): ?Conversation
    {
        foreach ($this->strategies as $strategyClass) {
            $conversation = (new $strategyClass($this->mail))->find();

            if ($conversation !== null) {
                Log::info('Conversation found via '.class_basename($strategyClass).' strategy');

                return $conversation;
            }
        }

        return null;
    }
}
