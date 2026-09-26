<?php

namespace App\Http\Controllers\Widget;

use App\Actions\ContactIdentifyAction;
use App\Builders\Messages\MessageBuilder;
use App\Channels\Capability;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Resources\Widget\WidgetMessageResource;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Messaging\SubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class MessagesController extends WidgetController
{
    public function index(Request $request): JsonResponse
    {
        $conversation = $this->conversation($request);

        $messages = $conversation === null
            ? collect()
            : (new MessageFinder($conversation, [
                'filter_internal_messages' => true,
                'before' => $request->query('before'),
                'after' => $request->query('after'),
            ]))->perform()->load('attachments');

        return response()->json([
            'payload' => WidgetMessageResource::collection($messages),
            'meta' => (object) ($conversation === null
                ? []
                : ['contact_last_seen_at' => $conversation->contact_last_seen_at?->getTimestamp() ?? 0]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $rejection = $this->rejectReplyToResolvedConversation($request);

        if ($rejection !== null) {
            return $rejection;
        }

        try {
            $message = DB::transaction(function () use ($request) {
                $conversation = $this->conversation($request) ?? $this->createFirstConversation($request);

                return (new MessageBuilder(
                    user: null,
                    conversation: $conversation,
                    params: $this->messageParams($request, $conversation),
                    incomingAllowed: true,
                ))->perform();
            });
        } catch (MessageValidationException $exception) {
            // render_record_invalid: khóa `message`, không phải `error`.
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(WidgetMessageResource::created($message));
    }

    public function update(Request $request, int $messageId, SubmissionService $submissions): JsonResponse
    {
        $message = $this->fetchVisitorMessage($request, $messageId);

        $reply = null;

        try {
            if ($message->contentTypeName() === 'input_email') {
                $this->submitEmail($request, $message);
            } else {
                $reply = $submissions->submit($message, $request->input('message.submitted_values'));
            }
        } catch (InvalidStructuredPayload $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (Throwable $exception) {
            return response()->json(['error' => [], 'message' => $exception->getMessage()], 500);
        }

        $contact = $this->contact($request);

        // Trả luôn tin trả lời vừa tạo và câu trả lời đã ghi: widget hiện ngay tin của khách thay
        // cho hàng chip, không phải đợi realtime.
        return response()->json([
            ...($contact === null ? [] : ['contact' => $contact->attributesToArray()]),
            'submitted_values' => $message->fresh()->content_attributes['submitted_values'] ?? null,
            ...($reply === null ? [] : ['message' => WidgetMessageResource::listItem($reply)]),
        ]);
    }

    /**
     * Khách tự thu hồi tin của mình. Hạn thu hồi là chính sách của kênh, việc xoá
     * đi chung Message::markDeleted với đường agent xoá để hai bên thấy cùng dấu vết.
     */
    public function destroy(Request $request, int $messageId): JsonResponse
    {
        $message = $this->fetchVisitorMessage($request, $messageId);
        $rejectionCode = $this->recallRejectionCode($request, $message);

        if ($rejectionCode !== null) {
            return response()->json(['error' => __("errors.widget_recall.{$rejectionCode}"), 'code' => $rejectionCode], 422);
        }

        $message->markDeleted($this->account($request)->locale);

        return response()->json(WidgetMessageResource::listItem($message->fresh()));
    }

    private function recallRejectionCode(Request $request, Message $message): ?string
    {
        return match (true) {
            ! $this->inbox($request)->supports(Capability::EventRecall) => 'capability_not_supported',
            ! $message->isIncoming() => 'not_own_message',
            $message->isDeleted() => 'already_recalled',
            ! $this->channel($request)->withinRecallWindow($message->created_at) => 'recall_window_expired',
            default => null,
        };
    }

    /**
     * Sticker khách chọn gửi lên là MÃ trong danh mục của kênh
     * (`content_attributes.sticker`), không phải URL: máy chủ tự tra ảnh và
     * payload, khách không nhét được ảnh ngoài vào tin.
     *
     * @return array<string, mixed>
     */
    protected function messageParams(Request $request, Conversation $conversation): array
    {
        $params = parent::messageParams($request, $conversation);
        $contentType = $request->input('message.content_type');

        if ($this->contactMaySend($contentType)) {
            $attributes = $request->input('message.content_attributes');

            return [
                ...$params,
                'content_type' => $contentType,
                'content_attributes' => [...(is_array($attributes) ? $attributes : []), ...$params['content_attributes']],
            ];
        }

        if ($contentType !== 'sticker') {
            return $params;
        }

        $stickerId = $request->input('message.content_attributes.sticker');

        return [
            ...$params,
            'content_type' => 'sticker',
            'sticker_id' => is_scalar($stickerId) ? (string) $stickerId : null,
        ];
    }

    /** Loại tin có cấu trúc mà khách được gửi (vd yêu cầu đặt hàng), theo khai báo của chính loại đó. */
    private function contactMaySend(mixed $contentType): bool
    {
        $type = is_string($contentType) ? app(StructuredTypeRegistry::class)->for($contentType) : null;

        return $type !== null && in_array(Message::TYPE_INCOMING, $type->allowedMessageTypes(), true);
    }

    // prevent_reply_to_resolved_conversation — ẩn ô soạn tin ở FE không chặn
    // được request, nên cờ inbox phải chặn ở đây.
    private function rejectReplyToResolvedConversation(Request $request): ?JsonResponse
    {
        $conversation = $this->conversation($request);

        if ($conversation === null || ! $conversation->isResolved()) {
            return null;
        }

        if ($this->inbox($request)->allow_messages_after_resolved) {
            return null;
        }

        return response()->json(['error' => __('errors.conversations.resolved')], 403);
    }

    // set_conversation + apply_labels: nhãn và custom_attributes chỉ áp cho hội
    // thoại VỪA tạo cùng tin đầu tiên.
    private function createFirstConversation(Request $request): Conversation
    {
        $conversation = $this->createConversation($request);

        $labels = (array) $request->input('labels', []);

        if ($labels !== []) {
            $conversation->updateLabels($labels);
        }

        return $conversation;
    }

    // Bản gốc quét trên MỌI hội thoại của khách chứ không chỉ hội thoại cuối,
    // để khách nhiều luồng vẫn sửa được tin của mình — và chỉ của mình.
    private function fetchVisitorMessage(Request $request, int $messageId): Message
    {
        $conversationIds = $this->conversationsQuery($request)->pluck('conversations.id');

        return Message::query()
            ->whereIn('conversation_id', $conversationIds)
            ->whereKey($messageId)
            ->firstOrFail();
    }

    private function submitEmail(Request $request, Message $message): void
    {
        $email = $this->contactEmail($request);

        $message->update([
            'content_attributes' => [...($message->content_attributes ?? []), 'submitted_email' => $email],
        ]);

        (new ContactIdentifyAction(
            contact: $this->contact($request),
            params: ['email' => $email, 'name' => $this->contactName($request)],
            retainOriginalContactName: true,
        ))->perform();
    }
}
