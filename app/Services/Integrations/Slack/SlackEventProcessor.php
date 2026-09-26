<?php

namespace App\Services\Integrations\Slack;

use App\Events\EventType;
use App\Jobs\Integrations\SendOnSlackJob;
use App\Jobs\Integrations\UpdateSlackMessageJob;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Contracts\EventProcessor;

// Driver Slack cắm vào lõi HookListener/HookJob
// qua hợp đồng EventProcessor (khoá `event_processor` trong config/integration/apps.php).
class SlackEventProcessor implements EventProcessor
{
    public function supportedEvents(): array
    {
        return [EventType::MESSAGE_CREATED->value, EventType::MESSAGE_UPDATED->value];
    }

    public function process(Hook $hook, string $eventName, array $eventData): void
    {
        /** @var ?Message $message */
        $message = $eventData['message'] ?? null;

        if ($message === null) {
            return;
        }

        match ($eventName) {
            EventType::MESSAGE_CREATED->value => $this->onMessageCreated($hook, $message),
            EventType::MESSAGE_UPDATED->value => $this->onMessageUpdated($hook, $message, $eventData),
            default => null,
        };
    }

    private function onMessageCreated(Hook $hook, Message $message): void
    {
        $job = SendOnSlackJob::dispatch($message, $hook);

        if ($message->attachments->isNotEmpty()) {
            $job->delay(now()->addSeconds(2));
        }
    }

    // "Chỉ tin nhắn bot tương tác lưu câu trả lời qua content_attributes
    // (submitted_values / submitted_email). Bỏ qua các content_type khác để
    // không bắn job Slack ở mọi lần sửa tin." (nguyên văn comment bản gốc)
    private function onMessageUpdated(Hook $hook, Message $message, array $eventData): void
    {
        if (! UpdateSlackMessageService::isSupportedContentType($message)) {
            return;
        }

        $previousChanges = $eventData['previous_changes'] ?? null;

        if (! is_array($previousChanges) || ! array_key_exists('content_attributes', $previousChanges)) {
            return;
        }

        UpdateSlackMessageJob::dispatch($message, $hook);
    }
}
