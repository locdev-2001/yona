<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\Message;
use App\Services\Integrations\GoogleTranslate\ProcessorService as GoogleTranslateProcessorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

// Port từ Api::V1::Accounts::Conversations::MessagesController.
// Bỏ: update status (đi cùng driver kênh gửi thật), destroy (context menu
// tin nhắn — port cùng cụm tiện ích), retry (SendReplyJob D4).
class MessagesController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $messages = (new MessageFinder($conversation, $request->all()))->perform()->load('attachments');

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

    // messages#translate — Integrations::GoogleTranslate::ProcessorService.
    // `Message#translations` của bản gốc là store_accessor trên content_attributes
    // (message.rb: store_accessor :content_attributes, …, :translations), không
    // phải cột riêng — nên bản port lưu đúng chỗ đó.
    public function translate(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse|Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $message = $conversation->messages()->findOrFail($messageId);
        $targetLanguage = (string) $request->input('target_language');

        if ($this->alreadyTranslated($message, $targetLanguage)) {
            return response()->noContent(200);
        }

        try {
            $translatedContent = (new GoogleTranslateProcessorService($message, $targetLanguage))->perform();
        } catch (Throwable $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        if (filled($translatedContent)) {
            $this->storeTranslation($message, $targetLanguage, $translatedContent);
        }

        return response()->json(['content' => $translatedContent]);
    }

    private function alreadyTranslated(Message $message, string $targetLanguage): bool
    {
        return filled($message->content_attributes['translations'][$targetLanguage] ?? null);
    }

    private function storeTranslation(Message $message, string $targetLanguage, string $translatedContent): void
    {
        $attributes = $message->content_attributes ?? [];
        $translations = $attributes['translations'] ?? [];
        $translations[$targetLanguage] = $translatedContent;
        $attributes['translations'] = $translations;

        $message->update(['content_attributes' => $attributes]);
    }
}
