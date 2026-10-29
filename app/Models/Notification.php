<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\UserResource;
use App\Jobs\Notification\EmailNotificationJob;
use App\Jobs\Notification\PushNotificationJob;
use App\Jobs\Notification\RemoveDuplicateNotificationJob;
use App\Models\Concerns\SharesRequestModels;
use App\Support\PlainTextContent;
use App\Support\RealtimePayload;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory, SharesRequestModels;

    // NOTIFICATION_TYPES — thứ tự cũng là vị trí bit trong NotificationSetting.
    public const TYPES = [
        'conversation_creation' => 1,
        'conversation_assignment' => 2,
        'assigned_conversation_new_message' => 3,
        'conversation_mention' => 4,
        'participating_conversation_new_message' => 5,
        'sla_missed_first_response' => 6,
        'sla_missed_next_response' => 7,
        'sla_missed_resolution' => 8,
        'friend_request' => 9,
        'friend_request_accepted' => 10,
    ];

    // Số từ giữ lại trong nội dung xem trước (content.truncate_words(10)).
    private const PREVIEW_WORD_LIMIT = 10;

    // Tin dùng làm nội dung xem trước của từng loại thông báo.
    private const PREVIEW_MESSAGE_SOURCES = [
        'conversation_creation' => 'first',
        'sla_missed_first_response' => 'first',
        'assigned_conversation_new_message' => 'secondary_actor',
        'participating_conversation_new_message' => 'secondary_actor',
        'conversation_mention' => 'secondary_actor',
        'conversation_assignment' => 'latest',
        'sla_missed_next_response' => 'latest',
        'sla_missed_resolution' => 'latest',
    ];

    protected $fillable = [
        'account_id',
        'user_id',
        'notification_type',
        'primary_actor_type',
        'primary_actor_id',
        'secondary_actor_type',
        'secondary_actor_id',
        'read_at',
        'snoozed_until',
        'last_activity_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'snoozed_until' => 'datetime',
            'last_activity_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public static function typeValue(string $name): int
    {
        return self::TYPES[$name] ?? 0;
    }

    protected static function booted(): void
    {
        // set_last_activity_at (before_create): mốc hoạt động = lúc tạo.
        static::creating(function (Notification $notification) {
            $notification->last_activity_at ??= now();
            $notification->meta ??= [];
        });

        // Phát notification.created trước khi dọn bản trùng: event xoá bản trùng mang số chưa
        // đọc đã tính cả thông báo mới, tới trước thì tab đang mở hội thoại đó nháy số.
        static::created(function (Notification $notification) {
            DomainEvent::dispatch(EventType::NOTIFICATION_CREATED, ['notification' => $notification]);

            $notification->processDelivery();
        });

        static::updated(function (Notification $notification) {
            DomainEvent::dispatch(EventType::NOTIFICATION_UPDATED, ['notification' => $notification]);
        });

        // Payload phẳng thay vì model: job chạy sau khi bản ghi đã biến mất.
        static::deleted(function (Notification $notification) {
            DomainEvent::dispatch(EventType::NOTIFICATION_DELETED, [
                'notification_data' => [
                    'id' => $notification->id,
                    'user_id' => $notification->user_id,
                    'account_id' => $notification->account_id,
                ],
            ]);
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function primaryActor(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'primary_actor_type', 'primary_actor_id');
    }

    public function secondaryActor(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'secondary_actor_type', 'secondary_actor_id');
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    // Lọc theo kênh: chỉ thông báo về hội thoại thuộc các kênh cho trước.
    /** @param  list<int>  $inboxIds */
    public function scopeForInboxes(Builder $query, array $inboxIds): Builder
    {
        return $query->where('primary_actor_type', (new Conversation)->getMorphClass())
            ->whereIn('primary_actor_id', Conversation::query()->select('id')->whereIn('inbox_id', $inboxIds));
    }

    // Đánh dấu đọc hàng loạt bằng một câu UPDATE rồi phát MỘT notification.updated mang
    // số chưa đọc cuối. Cập nhật từng bản ghi sẽ phát N event với số lùi dần; tab nhận
    // lệch thứ tự thì chuông và tiêu đề nháy số cũ.
    /** @param Builder<Notification> $query */
    public static function markAllRead(Builder $query): void
    {
        $unreadQuery = (clone $query)->unread();
        $latestNotificationId = (clone $unreadQuery)->orderByDesc('last_activity_at')->orderByDesc('id')->value('id');

        if ($latestNotificationId === null) {
            return;
        }

        $unreadQuery->update(['read_at' => now()]);

        DomainEvent::dispatch(EventType::NOTIFICATION_UPDATED, [
            'notification' => static::query()->findOrFail($latestNotificationId),
        ]);
    }

    public function typeName(): string
    {
        return array_flip(self::TYPES)[$this->notification_type] ?? '';
    }

    public function conversation(): ?Conversation
    {
        $actor = $this->primaryActor;

        return $actor instanceof Conversation ? $actor : null;
    }

    // Payload đẩy qua Reverb — rút gọn qua RealtimePayload::class.
    public function pushEventData(): array
    {
        $payload = [
            'id' => $this->id,
            'notification_type' => $this->typeName(),
            'primary_actor_type' => $this->primary_actor_type,
            'primary_actor_id' => $this->primary_actor_id,
            'read_at' => $this->read_at?->toISOString(),
            'secondary_actor' => $this->secondaryActorPushData(),
            'user' => $this->user === null ? null : UserResource::pushEventData($this->user, $this->account),
            'created_at' => $this->created_at->getTimestamp(),
            'last_activity_at' => $this->last_activity_at?->getTimestamp(),
            'snoozed_until' => $this->snoozed_until?->toISOString(),
            'meta' => $this->meta ?? [],
            'account_id' => $this->account_id,
        ];

        $primaryActor = $this->primaryActor;

        if ($primaryActor === null) {
            return $payload;
        }

        return [
            ...$payload,
            'primary_actor' => $primaryActor instanceof Friendship
                ? RealtimePayload::notificationFriendshipActor($primaryActor, $this->friendshipCounterpart())
                : RealtimePayload::notificationPrimaryActor($primaryActor),
            // TODO gốc: "Rename push_message_title to push_message_body" — hai khóa
            // cùng nội dung, FE đọc push_message_body.
            'push_message_title' => $this->pushMessageBody(),
            'push_message_body' => $this->pushMessageBody(),
            'message_preview' => $this->pushMessagePreview(),
        ];
    }

    public function pushMessageTitle(): string
    {
        $conversation = $this->conversation();
        $type = $this->typeName();

        return match ($type) {
            'conversation_creation' => __('notifications.notification_title.conversation_creation', [
                'display_id' => $conversation?->display_id,
                'inbox_name' => $conversation?->inbox->name,
            ]),
            'conversation_assignment',
            'assigned_conversation_new_message',
            'conversation_mention' => __("notifications.notification_title.$type", [
                'display_id' => $conversation?->display_id,
            ]),
            'participating_conversation_new_message' => __('notifications.notification_title.assigned_conversation_new_message', [
                'display_id' => $conversation?->display_id,
            ]),
            'sla_missed_first_response',
            'sla_missed_next_response',
            'sla_missed_resolution' => __("notifications.notification_title.$type", [
                'display_id' => $conversation?->display_id,
            ]),
            'friend_request',
            'friend_request_accepted' => __("notifications.notification_title.$type", [
                'name' => $this->friendshipCounterpart()?->availableName(),
            ]),
            default => '',
        };
    }

    public function pushMessageBody(): string
    {
        if ($this->isFriendshipType()) {
            return $this->friendshipCounterpart()?->availableName().': '.$this->pushMessagePreview();
        }

        if (! array_key_exists($this->typeName(), self::PREVIEW_MESSAGE_SOURCES)) {
            return '';
        }

        return ($this->previewMessage()?->sender?->name ?? '').': '.$this->pushMessagePreview();
    }

    // Nội dung không kèm tên người gửi, cho chỗ đã hiện tên riêng (hộp báo tin mới).
    public function pushMessagePreview(): string
    {
        if ($this->isFriendshipType()) {
            return __("notifications.friendship.{$this->typeName()}");
        }

        return array_key_exists($this->typeName(), self::PREVIEW_MESSAGE_SOURCES)
            ? $this->messageContent($this->previewMessage())
            : '';
    }

    private function isFriendshipType(): bool
    {
        return in_array($this->typeName(), ['friend_request', 'friend_request_accepted'], true);
    }

    private function previewMessage(): ?Message
    {
        $conversation = $this->conversation();

        $actor = match (self::PREVIEW_MESSAGE_SOURCES[$this->typeName()] ?? null) {
            'first' => $conversation?->firstMessage,
            'secondary_actor' => $this->secondaryActor,
            'latest' => $this->lastIncomingOrOutgoingMessage($conversation),
            default => null,
        };

        return $actor instanceof Message ? $actor : null;
    }

    // Người còn lại của lời mời kết bạn (secondary_actor).
    public function friendshipCounterpart(): ?User
    {
        $actor = $this->secondaryActor;

        return $actor instanceof User ? $actor : null;
    }

    private function lastIncomingOrOutgoingMessage(?Conversation $conversation): ?Message
    {
        if ($conversation === null) {
            return null;
        }

        return $conversation->lastIncomingMessage ?? $conversation->lastOutgoingMessage;
    }

    private function messageContent(?Message $message): string
    {
        if ($message !== null && filled($message->content)) {
            return PlainTextContent::fromMarkdown(
                PlainTextContent::truncateWords($message->content, self::PREVIEW_WORD_LIMIT)
            );
        }

        return $message?->attachments->isNotEmpty()
            ? __('notifications.attachment')
            : __('notifications.no_content');
    }

    private function secondaryActorPushData(): ?array
    {
        $actor = $this->secondaryActor;

        return $actor instanceof Message ? RealtimePayload::notificationSecondaryActor($actor) : null;
    }

    // process_notification_delivery: đẩy + email theo cài đặt, rồi dọn thông báo trùng.
    private function processDelivery(): void
    {
        if ($this->userSubscribedTo('push')) {
            PushNotificationJob::dispatch($this->id);
        }

        if ($this->userSubscribedTo('email')) {
            EmailNotificationJob::dispatch($this->id);
        }

        RemoveDuplicateNotificationJob::dispatch($this->id);
    }

    public function userSubscribedTo(string $deliveryType): bool
    {
        $setting = NotificationSetting::query()
            ->where('account_id', $this->account_id)
            ->where('user_id', $this->user_id)
            ->first();

        return $setting?->hasFlag($deliveryType, $this->typeName()) ?? false;
    }
}
