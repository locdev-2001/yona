<?php

namespace App\Http\Resources;

use App\Channels\LinksMessagesToSource;
use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Messaging\MessagePreview;
use App\Messaging\Structured\LegacyWebhookAliases;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Messages\WebhookContentNormalizer;
use App\Support\SharedModels;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_message.json.jbuilder + Message#push_event_data.
// Bỏ: voice call (EE).
class MessageResource extends JsonResource
{
    use SerializesAttributeMaps;

    /** Người gửi: agent cần vai trò trong account, khách và agent cần ảnh đại diện. */
    public const SENDER_RELATIONS = [
        User::class => ['accountUsers', 'avatar'],
        Contact::class => ['avatar'],
    ];

    /** @param iterable<Message> $messages */
    public static function collectionFor(iterable $messages): array
    {
        $messages = new EloquentCollection(collect($messages)->values()->all());
        self::preload($messages);

        return $messages
            ->map(fn (Message $message) => (new self($message))->toArray(request()))
            ->values()
            ->all();
    }

    /**
     * Nạp một lần cho cả nhóm tin mọi quan hệ payload tin cần (tệp, hội thoại,
     * người gửi kèm ảnh và vai trò), để N tin không thành N lượt truy vấn mỗi quan hệ.
     *
     * @param  EloquentCollection<int, Message>  $messages
     */
    public static function preload(EloquentCollection $messages): void
    {
        $messages->loadMissing([
            'attachments',
            'account',
            'inbox.channel',
            'conversation.contactInbox',
            'sender' => fn (MorphTo $sender) => $sender->morphWith(self::SENDER_RELATIONS),
        ]);

        $messages->each(fn (Message $message) => self::shareSenderAccount($message));
        $shared = app(SharedModels::class);
        $messages->each(fn (Message $message) => $message->sender instanceof User && $shared->remember($message->sender));
    }

    // Khách gửi tin cùng account với tin: payload khách đọc cờ tính năng của account.
    public static function shareSenderAccount(Message $message): void
    {
        if (! $message->relationLoaded('sender') || ! $message->relationLoaded('account')) {
            return;
        }

        $sender = $message->sender;

        if ($sender instanceof Contact && $sender->account_id === $message->account_id) {
            $sender->setRelation('account', $message->account);
        }
    }

    public function toArray(Request $request): array
    {
        /** @var Message $message */
        $message = $this->resource;

        return [
            'id' => $message->id,
            'content' => $message->content,
            'inbox_id' => $message->inbox_id,
            ...($message->echoId !== null ? ['echo_id' => $message->echoId] : []),
            'conversation_id' => $message->conversation->display_id,
            'message_type' => $message->message_type,
            'content_type' => $message->contentTypeName(),
            'status' => $message->statusName(),
            'content_attributes' => self::contentAttributes($message),
            'preview_text' => self::previewText($message),
            'created_at' => $message->created_at->getTimestamp(),
            'private' => $message->private,
            'source_id' => $message->source_id,
            ...self::sourceLinkPayload($message),
            ...($message->sender !== null ? ['sender' => self::senderPushEventData($message->sender, $message->account, $message->inbox)] : []),
            ...self::attachmentsPayload($message),
        ];
    }

    /**
     * content_attributes cho bề mặt hiển thị (dashboard, widget, realtime): payload
     * sticker lưu đường dẫn tệp, URL dựng lúc đọc.
     *
     * @return array<string, mixed>
     */
    public static function contentAttributes(Message $message): array
    {
        $attributes = $message->content_attributes ?? [];

        if (is_array($attributes['sticker'] ?? null)) {
            $attributes['sticker'] = app(StickerLibrary::class)->forReader($attributes['sticker']);
        }

        return $attributes;
    }

    // json.attachments … if message.attachments.present? — vắng hẳn khóa khi không có tệp.
    private static function attachmentsPayload(Message $message): array
    {
        $attachments = $message->attachments;

        return $attachments->isEmpty()
            ? []
            : ['attachments' => $attachments->map(fn (Attachment $attachment) => $attachment->pushEventData())->values()->all()];
    }

    // Đường mở tin tại nền tảng gốc khi kênh khai được; vắng hẳn khóa khi không có.
    private static function sourceLinkPayload(Message $message): array
    {
        $channel = $message->inbox?->channel;
        $url = $channel instanceof LinksMessagesToSource ? $channel->sourceMessageUrl($message) : null;

        return $url === null
            ? []
            : ['source_link' => ['url' => $url, 'platform' => $message->inbox->platform()->name]];
    }

    // Dòng xem trước cho danh sách hội thoại; chỉ gửi khi content không tự nói lên tin.
    private static function previewText(Message $message): ?string
    {
        $preview = app(MessagePreview::class);

        return $preview->replacesContent($message) ? $preview->for($message) : null;
    }

    // Message#push_event_data: toàn bộ attributes + sender + tóm tắt conversation.
    public static function pushEventData(Message $message): array
    {
        $data = [
            'id' => $message->id,
            'content' => $message->content,
            'account_id' => $message->account_id,
            'inbox_id' => $message->inbox_id,
            'conversation_id' => $message->conversation->display_id,
            'message_type' => $message->message_type,
            'created_at' => $message->created_at->getTimestamp(),
            'updated_at' => $message->updated_at->toISOString(),
            'private' => $message->private,
            'status' => $message->statusName(),
            'source_id' => $message->source_id,
            ...self::sourceLinkPayload($message),
            'content_type' => $message->contentTypeName(),
            'content_attributes' => self::contentAttributes($message),
            'preview_text' => self::previewText($message),
            'sender_type' => $message->sender_type,
            'sender_id' => $message->sender_id,
            'external_source_ids' => $message->external_source_ids ?? [],
            'additional_attributes' => self::attributeMap($message->additional_attributes),
            'processed_message_content' => $message->processed_message_content === $message->content
                ? null
                : $message->processed_message_content,
            'sentiment' => $message->sentiment ?? [],
            'conversation' => [
                'assignee_id' => $message->conversation->assignee_id,
                'unread_count' => $message->conversation->unreadIncomingMessagesCount(),
                'last_activity_at' => $message->conversation->last_activity_at->getTimestamp(),
                'contact_inbox' => [
                    'source_id' => $message->conversation->contactInbox?->source_id,
                ],
            ],
        ];

        if ($message->echoId !== null) {
            $data['echo_id'] = $message->echoId;
        }

        if ($message->sender !== null) {
            $data['sender'] = self::senderPushEventData($message->sender, $message->account, $message->inbox);
        }

        return [...$data, ...self::attachmentsPayload($message)];
    }

    // Message#merge_sender_attributes: sender là User hoặc Contact.
    public static function senderPushEventData(User|Contact|AgentBot $sender, ?Account $account = null, ?Inbox $inbox = null): array
    {
        return match (true) {
            $sender instanceof User => UserResource::pushEventData($sender, $account),
            $sender instanceof AgentBot => $sender->pushEventData($inbox),
            default => ContactResource::pushEventData($sender),
        };
    }

    // Message#webhook_push_event_data — push_event_data với nội dung đã chuẩn hoá.
    public static function webhookPushEventData(Message $message): array
    {
        return [
            ...self::pushEventData($message),
            'content_attributes' => LegacyWebhookAliases::apply($message->content_attributes ?? []),
            'content' => WebhookContentNormalizer::normalize($message->content),
            'processed_message_content' => WebhookContentNormalizer::normalize($message->processed_message_content),
        ];
    }

    // Message#webhook_data.
    public static function webhookData(Message $message): array
    {
        $data = [
            'account' => $message->account->webhookData(),
            'additional_attributes' => self::attributeMap($message->additional_attributes),
            'content_attributes' => LegacyWebhookAliases::apply($message->content_attributes ?? []),
            'content_type' => $message->contentTypeName(),
            'content' => WebhookContentNormalizer::normalize($message->content),
            'conversation' => ConversationResource::webhookData($message->conversation),
            'created_at' => $message->created_at?->toISOString(),
            'id' => $message->id,
            'inbox' => $message->inbox->webhookData(),
            'message_type' => Message::typeName($message->message_type),
            'private' => $message->private,
            'sender' => self::senderWebhookData($message->sender),
            'source_id' => $message->source_id,
        ];

        return [...$data, ...self::attachmentsPayload($message)];
    }

    private static function senderWebhookData(User|Contact|AgentBot|null $sender): ?array
    {
        return match (true) {
            $sender instanceof User => UserResource::webhookData($sender),
            $sender instanceof Contact => ContactResource::webhookData($sender),
            $sender instanceof AgentBot => $sender->webhookData(),
            default => null,
        };
    }
}
