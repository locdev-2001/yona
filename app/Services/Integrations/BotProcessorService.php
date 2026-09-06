<?php

namespace App\Services\Integrations;

use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use Illuminate\Support\Facades\Log;
use Throwable;

// Port từ refs/chatwoot/lib/integrations/bot_processor_service.rb — khung dùng
// chung cho một hook bot tự động trả lời tin nhắn. Hiện chỉ Dialogflow cắm vào
// (app/Services/Integrations/Dialogflow/ProcessorService.php); lớp con chỉ cần
// khai getResponse()/processResponse(), phần điều kiện chạy/không chạy nằm ở đây.
abstract class BotProcessorService
{
    /** @param  array<string, mixed>  $eventData */
    public function __construct(
        protected readonly string $eventName,
        protected readonly Hook $hook,
        protected readonly array $eventData,
    ) {}

    public function perform(): void
    {
        try {
            $message = $this->eventData['message'] ?? null;

            if (! $message instanceof Message || ! $this->shouldRunProcessor($message)) {
                return;
            }

            $this->processContent($message);
        } catch (Throwable $error) {
            // ChatwootExceptionTracker của bản gốc chỉ ghi log + báo lỗi, không
            // làm hỏng job gọi nó (HookJob đã tự rescue phía trên, đây thêm một
            // lớp chặn để lỗi API bên ngoài không văng ra khỏi processor).
            Log::warning($error->getMessage(), ['hook_id' => $this->hook->id, 'event' => $this->eventName]);
        }
    }

    /** Gọi bot ngoài lấy phản hồi cho một tin nhắn; trả null/rỗng nếu không có gì để xử lý. */
    abstract protected function getResponse(string $sessionId, string $content): mixed;

    /** Biến phản hồi của bot thành hành động: tạo tin trả lời hoặc handoff/resolve. */
    abstract protected function processResponse(Message $message, mixed $response): void;

    protected function messageContent(Message $message): ?string
    {
        if ($this->eventName === 'message.updated') {
            return $message->content_attributes['submitted_values'][0]['value'] ?? null;
        }

        return $message->content;
    }

    protected function processAction(Message $message, string $action): void
    {
        match ($action) {
            'handoff' => $message->conversation->botHandoff(),
            'resolve' => $message->conversation->update(['status' => Conversation::STATUS_RESOLVED]),
            default => null,
        };
    }

    private function shouldRunProcessor(Message $message): bool
    {
        if ($message->private) {
            return false;
        }

        if (! $this->processableMessage($message)) {
            return false;
        }

        return $message->conversation->status === Conversation::STATUS_PENDING;
    }

    private function processableMessage(Message $message): bool
    {
        if (! ($message->isIncoming() || $message->isOutgoing())) {
            return false;
        }

        return ! $message->isOutgoing() || $this->processableOutgoingMessage($message);
    }

    private function processableOutgoingMessage(Message $message): bool
    {
        return $this->eventName === 'message.updated'
            && $message->content_type === Message::CONTENT_TYPES['input_select'];
    }

    private function processContent(Message $message): void
    {
        $content = $this->messageContent($message);

        if (blank($content)) {
            return;
        }

        $sessionId = $message->conversation->contactInbox?->source_id;

        if (blank($sessionId)) {
            return;
        }

        $response = $this->getResponse($sessionId, $content);

        if (filled($response)) {
            $this->processResponse($message, $response);
        }
    }
}
