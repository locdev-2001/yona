<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Builders\Messages\MessageBuilder;
use App\Channels\Capability;
use App\Exceptions\MessageValidationException;
use App\Finders\MessageFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Messaging\Delivery\OutboundOrder;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Channels\ChannelOutboundActions;
use App\Services\Integrations\GoogleTranslate\ProcessorService as GoogleTranslateProcessorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Throwable;

// Port từ Api::V1::Accounts::Conversations::MessagesController.
// Bỏ: update status (đi cùng driver kênh gửi thật).
class MessagesController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $messages = (new MessageFinder($conversation, $request->all()))->perform()->load('attachments');
        // Dựng payload trước: người gửi đã nạp được dùng lại cho assignee ở meta.
        $payload = MessageResource::collectionFor($messages);

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
            'payload' => $payload,
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
            app(OutboundOrder::class)->dispatch($message);
        }

        return response()->json((new MessageResource($message))->toArray($request));
    }

    /**
     * messages#destroy — port nguyên hành vi gốc (đánh dấu tin bị xoá + xoá đính
     * kèm, Message::markDeleted). Kênh khai `outbound_recall` thì thu hồi Ở KÊNH
     * TRƯỚC (quyết định founder Q4 07/09: thu hồi hai chiều): kênh từ chối thì tin
     * được GIỮ NGUYÊN và lý do hiện ra, vì xoá một chiều nghĩa là khách vẫn đọc
     * được tin mà agent tưởng đã rút.
     */
    public function destroy(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $message = $conversation->messages()->findOrFail($messageId);

        if ($message->isDeleted()) {
            return response()->json((new MessageResource($message))->toArray($request));
        }

        $failure = $this->recallOnChannel($conversation, $message);

        if ($failure !== null) {
            return response()->json(['error' => $failure['message'] ?? '', 'code' => $failure['code'] ?? ''], 422);
        }

        $message->markDeleted($account->locale);

        return response()->json((new MessageResource($message->fresh()))->toArray($request));
    }

    /**
     * messages#reactions — ngoài bản gốc;
     * dựng theo docs/channel-capabilities.md §2.2 `outbound_reaction`. Lõi trung
     * tính: emoji vào, driver kênh tự dịch sang mã của nền tảng.
     */
    // Đánh dấu thẻ chuyển khoản đã nhận tiền: ghi content_attributes.paid_at +
    // paid_by (kích hoạt MESSAGE_UPDATED qua hook `updated` của Message). Đã
    // đánh dấu rồi thì không ghi lại — bấm nhiều lần không đổi ai/lúc nào.
    public function markBankTransferPaid(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $message = $conversation->messages()->findOrFail($messageId);

        abort_unless($message->contentTypeName() === 'bank_transfer', 422, 'not_a_bank_transfer_card');

        if (blank($message->content_attributes['paid_at'] ?? null)) {
            $message->update(['content_attributes' => [
                ...($message->content_attributes ?? []),
                'paid_at' => now()->toISOString(),
                'paid_by' => $request->user()->id,
            ]]);
        }

        return response()->json((new MessageResource($message->fresh()))->toArray($request));
    }

    public function storeReaction(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        $emoji = trim((string) $request->input('emoji'));

        if ($emoji === '') {
            return response()->json(['error' => 'emoji_required'], 422);
        }

        return $this->applyReaction($request, $account, $conversationId, $messageId, $emoji);
    }

    public function destroyReaction(Request $request, Account $account, int $conversationId, int $messageId): JsonResponse
    {
        return $this->applyReaction($request, $account, $conversationId, $messageId, null);
    }

    private function applyReaction(Request $request, Account $account, int $conversationId, int $messageId, ?string $emoji): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $message = $conversation->messages()->findOrFail($messageId);
        $driver = $this->channelDriver($conversation, Capability::OutboundReaction);

        $outcome = $driver->reaction($message, $emoji);

        if (! ($outcome['ok'] ?? false)) {
            return response()->json(['error' => $outcome['message'] ?? '', 'code' => $outcome['code'] ?? ''], 422);
        }

        $message->setReaction(Message::REACTION_BY_AGENT_PREFIX.$request->user()->id, $emoji);

        return response()->json((new MessageResource($message->fresh()))->toArray($request));
    }

    /** @return array{ok: bool, code?: string, message?: string}|null */
    private function recallOnChannel(Conversation $conversation, Message $message): ?array
    {
        if (! $conversation->inbox->supports(Capability::OutboundRecall)) {
            return null;
        }

        $outcome = ChannelActionRegistry::for($conversation->inbox)?->recall($message) ?? ['ok' => true];

        return ($outcome['ok'] ?? false) ? null : $outcome;
    }

    /** Kênh không khai năng lực ⇒ 422 `capability_not_supported` (§1.4), không 500. */
    private function channelDriver(Conversation $conversation, Capability $capability): ChannelOutboundActions
    {
        abort_unless($conversation->inbox->supports($capability), 422, 'capability_not_supported');

        $driver = ChannelActionRegistry::for($conversation->inbox);

        abort_if($driver === null, 422, 'capability_not_supported');

        return $driver;
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
     * xoá sạch sẽ mất `in_reply_to`, `sticker`, `external_source_ids` — tức tin gửi
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
