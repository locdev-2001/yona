<?php

namespace App\Services\Webhooks;

use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Messages\StatusUpdateService;
use App\Support\SafeHttp;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

// Port từ refs/chatwoot/lib/webhooks/trigger.rb — một chỗ duy nhất gửi HTTP ra
// ngoài cho cả ba loại webhook (account, inbox API, agent bot).
class Trigger
{
    public const TYPE_ACCOUNT = 'account_webhook';

    public const TYPE_API_INBOX = 'api_inbox_webhook';

    public const TYPE_AGENT_BOT = 'agent_bot_webhook';

    private const ERROR_HANDLED_EVENTS = ['message_created', 'message_updated'];

    private const RETRYABLE_AGENT_BOT_STATUSES = [429, 500];

    public function __construct(
        private readonly string $url,
        private readonly array $payload,
        private readonly string $webhookType = self::TYPE_ACCOUNT,
        private readonly ?string $secret = null,
        private readonly ?string $deliveryId = null,
    ) {}

    public static function execute(
        string $url,
        array $payload,
        string $webhookType = self::TYPE_ACCOUNT,
        ?string $secret = null,
        ?string $deliveryId = null,
    ): void {
        (new self($url, $payload, $webhookType, $secret, $deliveryId))->perform();
    }

    public function perform(): void
    {
        try {
            $this->performRequest();
        } catch (Throwable $error) {
            if ($this->isRetryableAgentBotError($error)) {
                throw new RetryableError($this->httpStatus($error), $error->getMessage());
            }

            $this->handleFailure($error);
        }
    }

    public function handleFailure(Throwable $error): void
    {
        $this->handleError($error);
        Log::warning("Exception: Invalid webhook URL {$this->url} : {$error->getMessage()}");
    }

    private function performRequest(): void
    {
        SafeHttp::assertPublicUrl($this->url);

        $body = (string) json_encode($this->payload);
        $timeout = $this->webhookTimeout();

        $response = Http::withHeaders($this->requestHeaders($body))
            ->connectTimeout($timeout)
            ->timeout($timeout)
            ->withBody($body, 'application/json')
            ->post($this->url);

        if ($response->failed()) {
            throw new HttpError($response->status(), trim($response->status().' '.$response->reason()));
        }
    }

    /** @return array<string, string> */
    private function requestHeaders(string $body): array
    {
        $headers = ['Content-Type' => 'application/json', 'Accept' => 'application/json'];

        if (filled($this->deliveryId)) {
            $headers['X-Chatwoot-Delivery'] = $this->deliveryId;
        }

        if (filled($this->secret)) {
            $timestamp = (string) now()->getTimestamp();
            $headers['X-Chatwoot-Timestamp'] = $timestamp;
            $headers['X-Chatwoot-Signature'] = 'sha256='.hash_hmac('sha256', "{$timestamp}.{$body}", (string) $this->secret);
        }

        return $headers;
    }

    private function handleError(Throwable $error): void
    {
        if (! in_array($this->payload['event'] ?? null, self::ERROR_HANDLED_EVENTS, true)) {
            return;
        }

        $message = $this->message();

        if ($message === null) {
            return;
        }

        match ($this->webhookType) {
            self::TYPE_AGENT_BOT => $this->reopenPendingConversation($message),
            self::TYPE_API_INBOX => (new StatusUpdateService($message, 'failed'))->perform(),
            default => null,
        };
    }

    private function reopenPendingConversation(Message $message): void
    {
        $conversation = $message->conversation;

        if ($conversation === null || $conversation->status !== Conversation::STATUS_PENDING) {
            return;
        }

        if ($conversation->account->setting('keep_pending_on_bot_failure')) {
            return;
        }

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        ActivityMessageJob::dispatch($conversation, [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_ACTIVITY,
            'content' => __('conversations.activity.agent_bot.error_moved_to_open'),
        ]);
    }

    private function message(): ?Message
    {
        $messageId = $this->payload['id'] ?? null;

        return blank($messageId) ? null : Message::query()->find($messageId);
    }

    private function webhookTimeout(): int
    {
        $timeout = (int) config('webhooks.timeout');

        return $timeout > 0 ? $timeout : 5;
    }

    private function isRetryableAgentBotError(Throwable $error): bool
    {
        return $this->webhookType === self::TYPE_AGENT_BOT
            && in_array($this->httpStatus($error), self::RETRYABLE_AGENT_BOT_STATUSES, true);
    }

    private function httpStatus(Throwable $error): ?int
    {
        return $error instanceof HttpError ? $error->status : null;
    }
}
