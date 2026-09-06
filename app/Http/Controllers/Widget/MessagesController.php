<?php

namespace App\Http\Controllers\Widget;

use App\Actions\ContactIdentifyAction;
use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Resources\Widget\WidgetMessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\SubmittedValues;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

// Port từ refs/chatwoot/app/controllers/api/v1/widget/messages_controller.rb.
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
            // render_record_invalid của Chatwoot: khóa `message`, không phải `error`.
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(WidgetMessageResource::created($message));
    }

    public function update(Request $request, int $messageId): JsonResponse
    {
        $message = $this->fetchVisitorMessage($request, $messageId);

        try {
            if ($message->contentTypeName() === 'input_email') {
                $this->submitEmail($request, $message);
            } else {
                $message->update([
                    'content_attributes' => [
                        ...($message->content_attributes ?? []),
                        'submitted_values' => SubmittedValues::permit($request->input('message.submitted_values')),
                    ],
                ]);
            }
        } catch (Throwable $exception) {
            return response()->json(['error' => [], 'message' => $exception->getMessage()], 500);
        }

        $contact = $this->contact($request);

        return response()->json($contact === null ? [] : ['contact' => $contact->attributesToArray()]);
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

    // Chatwoot quét trên MỌI hội thoại của khách chứ không chỉ hội thoại cuối,
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
