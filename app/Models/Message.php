<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Exceptions\MessageValidationException;
use App\Services\MessageTemplates\HookExecutionService;
use App\Support\LiquidTemplate;
use App\Support\MessageDrops;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// Port từ refs/chatwoot/app/models/message.rb.
// Bỏ: SendReplyJob (webhook outbound D4), email content (F1),
// agent bot/captain (EE), searchkick (EE), translations (F6).
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

    public const NUMBER_OF_PERMITTED_ATTACHMENTS = 15;

    // Transient như attr_accessor :echo_id — FE gửi kèm để tự khớp bản nháp.
    public ?string $echoId = null;

    // Tương đương has_many :attachments, autosave: true — builder gán tệp đã
    // dựng, model lưu ngay trong lượt tạo để payload realtime đã có attachments.
    /** @var list<Attachment> */
    public array $pendingAttachments = [];

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
            // ensure_content_type + prevent_message_flooding + Liquidable#process_liquid_in_content.
            $message->content_type ??= self::CONTENT_TYPES['text'];
            $message->preventMessageFlooding();
            $message->renderContentVariables();
        });

        static::saving(function (Message $message) {
            $message->validateContentLength();
            $message->ensureProcessedMessageContent();
        });

        static::deleting(function (Message $message) {
            // has_many :attachments, dependent: :destroy — xóa từng bản ghi để
            // hook deleted của Attachment dọn luôn tệp trên đĩa.
            $message->attachments->each->delete();
        });

        static::created(function (Message $message) {
            // autosave attachments chạy trong chính lượt save! của Rails —
            // phải xong trước mọi after_create_commit bên dưới.
            $message->persistPendingAttachments();

            // execute_after_create_commit_callbacks — giữ đúng thứ tự bản gốc;
            // send_reply cắt sang D4.
            $message->reopenConversation();
            $message->setConversationActivity();
            $message->dispatchCreateEvents();
            $message->executeMessageTemplateHooks();
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

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function csatSurveyResponse(): HasOne
    {
        return $this->hasOne(CsatSurveyResponse::class);
    }

    // validate_attachments_limit (before_add) — chặn trước khi thêm tệp thứ 16.
    public static function guardAttachmentsLimit(int $currentCount): void
    {
        $limit = (int) config('limits.number_of_permitted_attachments', self::NUMBER_OF_PERMITTED_ATTACHMENTS);

        if ($currentCount >= $limit) {
            throw new MessageValidationException('Attachments exceeded maximum allowed');
        }
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

    public function isInputCsat(): bool
    {
        return $this->content_type === self::CONTENT_TYPES['input_csat'];
    }

    // auto_reply_email? — kênh email chưa port nên chỉ còn nhánh incoming_email.
    public function isAutoReplyEmail(): bool
    {
        if ($this->content_type !== self::CONTENT_TYPES['incoming_email']) {
            return false;
        }

        return data_get($this->content_attributes, 'email.auto_reply') === true;
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

    public function scopeTemplate(Builder $query): Builder
    {
        return $query->where('message_type', self::TYPE_TEMPLATE);
    }

    // scope :today — so theo NGÀY của lịch, không phải 24 giờ gần nhất.
    public function scopeToday(Builder $query): Builder
    {
        return $query->whereRaw("date_trunc('day', created_at) = ?", [now()->startOfDay()]);
    }

    private function persistPendingAttachments(): void
    {
        if ($this->pendingAttachments === []) {
            return;
        }

        foreach ($this->pendingAttachments as $attachment) {
            $this->attachments()->save($attachment);
        }

        $this->setRelation('attachments', collect($this->pendingAttachments));
        $this->pendingAttachments = [];
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

    // Liquidable#process_liquid_in_content: chỉ tin agent gửi ra và tin mẫu mới
    // được tham chiếu biến — tin của khách giữ nguyên văn.
    private function renderContentVariables(): void
    {
        if (blank($this->content) || ! in_array($this->message_type, [self::TYPE_OUTGOING, self::TYPE_TEMPLATE], true)) {
            return;
        }

        $this->content = LiquidTemplate::render($this->content, MessageDrops::forMessage($this));
    }

    private function executeMessageTemplateHooks(): void
    {
        (new HookExecutionService($this))->perform();
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

        // `return if conversation.muted?` — khách bị chặn nhắn tiếp không kéo
        // hội thoại đã đóng quay lại hàng đợi của agent.
        if ($conversation->isMuted()) {
            return;
        }

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
