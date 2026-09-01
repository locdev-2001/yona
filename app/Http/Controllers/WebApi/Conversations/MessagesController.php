<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Conversations::MessagesController.
// Bỏ ở B3: update status (đi cùng driver kênh gửi thật), destroy (context menu
// tin nhắn — port cùng cụm tiện ích), retry (SendReplyJob D4), translate (F6).
class MessagesController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $messages = (new MessageFinder($conversation, $request->all()))->perform();

        return response()->json([
            'meta' => [
                'labels' => $conversation->cachedLabelListArray(),
                'additional_attributes' => $conversation->additional_attributes ?? [],
                'contact' => MessageResource::senderPushEventData($conversation->contact),
                ...($conversation->assignee !== null
                    ? ['assignee' => MessageResource::senderPushEventData($conversation->assignee)]
                    : []),
                'agent_last_seen_at' => $conversation->agent_last_seen_at?->toISOString(),
                'assignee_last_seen_at' => $conversation->assignee_last_seen_at?->toISOString(),
            ],
            'payload' => MessageResource::collectionFor($messages),
        ]);
    }

    public function store(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        try {
            $message = (new MessageBuilder($request->user(), $conversation, $request->all()))->perform();
        } catch (MessageValidationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        return response()->json((new MessageResource($message))->toArray($request));
    }
}
