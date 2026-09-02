<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Exceptions\MessageValidationException;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// Port từ refs/chatwoot/app/models/message.rb.
// Bỏ ở B3: SendReplyJob (webhook outbound D4), attachments (B9), email content/liquid (F1), template hooks (D6),
// agent bot/captain (EE), searchkick (EE), translations (F6), csat (C5).
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    public const TYPE_INCOMING = 0;

    public const TYPE_OUTGOING = 1;

    public const TYPE_ACTIVITY = 2;

    public const TYPE_TEMPLATE = 3;

    public const MESSAGE_TYPES = [
        'incoming' => self::TYPE_INCOMING,
        'outgoing' => self::TYPE_OUTGOING,
        'activity' => self::TYPE_ACTIVITY,
        'template' => self::TYPE_TEMPLATE,
    ];

    public const CONTENT_TYPES = [
        'text' => 0,
        'input_text' => 1,
        'input_textarea' => 2,
        'input_email' => 3,
        'input_select' => 4,
        'cards' => 5,
        'form' => 6,
        'article' => 7,
        'incoming_email' => 8,
        'input_csat' => 9,
        'integrations' => 10,
        'sticker' => 11,
        'voice_call' => 12,
    ];

    public const STATUSES = [
        'sent' => 0,
        'delivered' => 1,
        'read' => 2,
        'failed' => 3,
    ];

    public const MAX_CONTENT_LENGTH = 150000;

    // Transient như attr_accessor :echo_id — FE gửi kèm để tự khớp bản nháp.
    public ?string $echoId = null;

    // Default DB chưa có trên model mới tạo — set sẵn cho serializer.
    protected $attributes = [
        'status' => 0,
        'private' => false,
    ];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'conversation_id',
        'content',
        'message_type',
        'private',
        'status',
        'source_id',
        'content_type',
        'content_attributes',
        'sender_type',
        'sender_id',
        'external_source_ids',
        'additional_attributes',
    ];

    protected function casts(): array
    {
        return [
            'private' => 'boolean',
            'content_attributes' => 'array',
            'external_source_ids' => 'array',
            'additional_attributes' => 'array',
            'sentiment' => 'array',
        ];
    }

    public static function typeName(int $messageType): string
    {
        return array_flip(self::MESSAGE_TYPES)[$messageType];
    }

    public static function typeFromName(string $name): ?int
    {
        return self::MESSAGE_TYPES[$name] ?? null;
    }

    public static function contentTypeFromName(?string $name): ?int
    {
        return $name === null ? null : (self::CONTENT_TYPES[$name] ?? null);
    }

    protected static function booted(): void
    {
        static::creating(function (Message $message) {
            // ensure_content_type + prevent_message_flooding.
            $message->content_type ??= self::CONTENT_TYPES['text'];
            $message->preventMessageFlooding();
        });

        static::saving(function (Message $message) {
            $message->validateContentLength();
            $message->ensureProcessedMessageContent();
        });

        static::created(function (Message $message) {
            // execute_after_create_commit_callbacks — giữ đúng thứ tự bản gốc;
            // send_reply/template hooks cắt sang D4/D6.
            $message->reopenConversation();
            $message->setConversationActivity();
            $message->dispatchCreateEvents();
            $message->updateContactActivity();
        });

        static::updated(function (Message $message) {
            $message->sendUpdateEvent();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): MorphTo
    {
        return $this->morphTo();
    }

    public function contentTypeName(): string
    {
        return array_flip(self::CONTENT_TYPES)[$this->content_type];
    }

    public function statusName(): ?string
    {
        return $this->status === null ? null : array_flip(self::STATUSES)[$this->status];
    }

    public function isIncoming(): bool
    {
        return $this->message_type === self::TYPE_INCOMING;
    }

    public function isOutgoing(): bool
    {
        return $this->message_type === self::TYPE_OUTGOING;
    }

    public function scopeChat(Builder $query): Builder
    {
        return $query->where('message_type', '!=', self::TYPE_ACTIVITY)->where('private', false);
    }

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_INCOMING);
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_OUTGOING);
    }

    private function preventMessageFlooding(): void
    {
        if ($this->conversation_id === null || $this->conversation === null) {
            return;
        }

        $limit = (int) config('limits.conversation_message_per_minute');

        $recentCount = $this->conversation->messages()
            ->where('created_at', '>=', now()->subMinute())
            ->count();

        if ($recentCount >= $limit) {
            throw new MessageValidationException('Too many messages');
        }
    }

    private function validateContentLength(): void
    {
        foreach (['content', 'processed_message_content'] as $attribute) {
            $value = $this->getAttribute($attribute);

            if ($value !== null && mb_strlen($value) > self::MAX_CONTENT_LENGTH) {
                throw new MessageValidationException(
                    ucfirst(str_replace('_', ' ', $attribute)).' is too long (maximum is 150000 characters)'
                );
            }
        }
    }

    private function ensureProcessedMessageContent(): void
    {
        $email = $this->content_attributes['email'] ?? [];
        $messageContent = data_get($email, 'text_content.quoted')
            ?? data_get($email, 'html_content.quoted')
            ?? $this->content;

        $this->processed_message_content = $messageContent === null
            ? null
            : self::truncateLikeRails($messageContent);
    }

    private static function truncateLikeRails(string $value): string
    {
        if (mb_strlen($value) <= self::MAX_CONTENT_LENGTH) {
            return $value;
        }

        return mb_substr($value, 0, self::MAX_CONTENT_LENGTH - 3).'...';
    }

    private function reopenConversation(): void
    {
        if (! $this->isIncoming()) {
            return;
        }

        $conversation = $this->conversation;

        if ($conversation->isSnoozed()) {
            $conversation->update(['status' => Conversation::STATUS_OPEN]);
        }

        // reopen_resolved_conversation: inbox bot chưa port — API/kênh khác đều mở lại.
        if ($conversation->isResolved()) {
            $conversation->update(['status' => Conversation::STATUS_OPEN]);
        }
    }

    private function setConversationActivity(): void
    {
        // update_columns: không chạy hook, updated_at đổi theo thời điểm hiện tại.
        $this->conversation->newModelQuery()->whereKey($this->conversation_id)->toBase()->update([
            'last_activity_at' => $this->created_at,
            'updated_at' => now(),
        ]);
        $this->conversation->setAttribute('last_activity_at', $this->created_at);
        $this->conversation->syncOriginalAttribute('last_activity_at');
    }

    // dispatch_create_events + update_waiting_since (REPLY_CREATED bắn ở D2).
    private function dispatchCreateEvents(): void
    {
        $conversation = $this->conversation;

        DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $this, 'performed_by' => auth()->user()]);

        if ($this->isValidFirstReply()) {
            DomainEvent::dispatch(EventType::FIRST_REPLY_CREATED, ['message' => $this, 'performed_by' => auth()->user()]);
            $conversation->update(['first_reply_created_at' => $this->created_at, 'waiting_since' => null]);

            return;
        }

        if ($conversation->waiting_since !== null && ! $this->private && $this->isHumanResponse()) {
            $conversation->update(['waiting_since' => null]);
        }

        if ($this->isIncoming() && $conversation->waiting_since === null) {
            $conversation->update(['waiting_since' => $this->created_at]);
        }
    }

    // Eloquent chỉ bắn `updated` khi có cột đổi — tương đương guard
    // previous_changes.blank? của dispatch_update_event.
    private function sendUpdateEvent(): void
    {
        DomainEvent::dispatch(EventType::MESSAGE_UPDATED, [
            'message' => $this,
            'performed_by' => auth()->user(),
            'previous_changes' => PreviousChanges::of($this),
        ]);
    }

    private function isValidFirstReply(): bool
    {
        if (! $this->isHumanResponse() || $this->private) {
            return false;
        }

        if ($this->conversation->first_reply_created_at !== null) {
            return false;
        }

        $priorOutgoingCount = $this->conversation->messages()
            ->outgoing()
            ->where(fn (Builder $query) => $query->whereNull('sender_type')->orWhere('sender_type', '!=', 'AgentBot'))
            ->where('private', false)
            ->whereRaw("(additional_attributes->'campaign_id') is null")
            ->count();

        return $priorOutgoingCount <= 1;
    }

    private function isHumanResponse(): bool
    {
        return $this->isOutgoing()
            && blank($this->content_attributes['automation_rule_id'] ?? null)
            && blank($this->additional_attributes['campaign_id'] ?? null)
            && ($this->sender instanceof User || filled($this->content_attributes['external_echo'] ?? null));
    }

    private function updateContactActivity(): void
    {
        if ($this->sender instanceof Contact) {
            $this->sender->update(['last_activity_at' => now()]);
        }
    }
}
