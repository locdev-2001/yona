<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Jobs\SendReplyJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Integrations\GoogleTranslate\ProcessorService as GoogleTranslateProcessorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Throwable;

// Port từ Api::V1::Accounts::Conversations::MessagesController.
// Bỏ: update status (đi cùng driver kênh gửi thật), destroy (context menu
// tin nhắn — port cùng cụm tiện ích).
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

    /**
     * messages#retry — port từ MessagesController#retry + #claim_message_retry của
     * bản gốc. Mọi kênh khai `outbound_retry` (docs/channel-capabilities.md §2.2)
     * dùng chung đường này: chỉ tin `failed` mới gửi lại, khoá bản ghi để hai cú
     * bấm không đẩy hai job, rồi trả tin đã cập nhật cho UI.
     */
    public function retry(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $message = $conversation->messages()->findOrFail($messageId);

        if ($this->claimMessageRetry($conversation, $message)) {
            $message->refresh();
            SendReplyJob::dispatch($message);
        }

        return response()->json((new MessageResource($message))->toArray($request));
    }

    private function claimMessageRetry(Conversation $conversation, Message $message): bool
    {
        return DB::transaction(function () use ($conversation, $message) {
            $claimed = $conversation->messages()->whereKey($message->getKey())->lockForUpdate()->first();

            if ($claimed === null || $claimed->status !== Message::STATUSES['failed']) {
                return false;
            }

            $attributes = ['status' => Message::STATUSES['sent'], 'content_attributes' => $this->attributesForRetry($claimed)];

            // Bản gốc xoá source_id (trừ inbox API/widget) — còn source_id thì
            // driver coi tin là tin do kênh dội về và bỏ qua lượt gửi lại.
            if (! $conversation->inbox->isApi() && ! $conversation->inbox->isWebWidget()) {
                $attributes['source_id'] = null;
            }

            $claimed->update($attributes);

            return true;
        });
    }

    /**
     * Bản gốc đặt `content_attributes: {}` (xoá sạch). Ở đây chỉ bỏ lý do lỗi:
     * xoá sạch sẽ mất `in_reply_to`, `sticker`, `zalo_source_ids` — tức tin gửi
     * lại rụng trích dẫn và echo của phần đã gửi được sẽ thành bong bóng ma.
     *
     * @return array<string, mixed>
     */
    private function attributesForRetry(Message $message): array
    {
        $attributes = $message->content_attributes ?? [];
        unset($attributes['external_error']);

        return $attributes;
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
