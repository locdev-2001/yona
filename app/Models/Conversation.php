<?php

namespace App\Models;

use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/conversation.rb.
// Bỏ ở B3: dispatcher events + FilteredCountInvalidator (B4), activity messages +
// toggle_status/snooze (B5), AssignmentHandler/AutoAssignmentHandler (B6),
// Labelable (B7), mentions/participants (B11), csat (C5), agent bot + SLA (EE/D4),
// mute (Redis — B4), campaigns (C4).
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use HasFactory;

    public const STATUS_OPEN = 0;

    public const STATUS_RESOLVED = 1;

    public const STATUS_PENDING = 2;

    public const STATUS_SNOOZED = 3;

    public const STATUS_NAMES = [
        self::STATUS_OPEN => 'open',
        self::STATUS_RESOLVED => 'resolved',
        self::STATUS_PENDING => 'pending',
        self::STATUS_SNOOZED => 'snoozed',
    ];

    public const PRIORITY_LOW = 0;

    public const PRIORITY_MEDIUM = 1;

    public const PRIORITY_HIGH = 2;

    public const PRIORITY_URGENT = 3;

    public const PRIORITY_NAMES = [
        self::PRIORITY_LOW => 'low',
        self::PRIORITY_MEDIUM => 'medium',
        self::PRIORITY_HIGH => 'high',
        self::PRIORITY_URGENT => 'urgent',
    ];

    // Default DB chưa có trên model mới tạo — set sẵn cho hook/serializer.
    protected $attributes = [
        'status' => self::STATUS_OPEN,
    ];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'contact_id',
        'contact_inbox_id',
        'status',
        'assignee_id',
        'team_id',
        'additional_attributes',
        'custom_attributes',
        'snoozed_until',
        'identifier',
        'priority',
        'contact_last_seen_at',
        'agent_last_seen_at',
        'assignee_last_seen_at',
        'first_reply_created_at',
        'waiting_since',
        'last_activity_at',
    ];

    public static function statusFromName(string $name): int
    {
        return array_flip(self::STATUS_NAMES)[$name] ?? self::STATUS_OPEN;
    }

    public static function priorityFromName(?string $name): ?int
    {
        return $name === null ? null : (array_flip(self::PRIORITY_NAMES)[$name] ?? null);
    }

    protected function casts(): array
    {
        return [
            'additional_attributes' => 'array',
            'custom_attributes' => 'array',
            'contact_last_seen_at' => 'datetime',
            'agent_last_seen_at' => 'datetime',
            'assignee_last_seen_at' => 'datetime',
            'snoozed_until' => 'datetime',
            'first_reply_created_at' => 'datetime',
            'waiting_since' => 'datetime',
            'last_activity_at' => 'datetime',
            'status_changed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Conversation $conversation) {
            // validate_additional_attributes + determine_conversation_status +
            // ensure_waiting_since (nhánh campaign/bot chưa port).
            if (! is_array($conversation->additional_attributes)) {
                $conversation->additional_attributes = [];
            }
            $conversation->validateRefererUrl();

            if ($conversation->contact?->blocked) {
                $conversation->status = self::STATUS_RESOLVED;
            }

            // waiting_since = created_at đúng như before_create của bản gốc —
            // chốt created_at tại đây để hai giá trị trùng nhau tuyệt đối.
            if (! $conversation->isDirty('created_at')) {
                $conversation->setAttribute('created_at', $conversation->freshTimestamp());
            }
            $conversation->waiting_since = $conversation->created_at;
            $conversation->last_activity_at ??= $conversation->created_at;
        });

        static::saving(function (Conversation $conversation) {
            // ensure_snooze_until_reset + set_status_changed_at.
            if ($conversation->status !== self::STATUS_SNOOZED) {
                $conversation->snoozed_until = null;
            }

            if (! $conversation->exists || $conversation->isDirty('status')) {
                $conversation->status_changed_at = $conversation->freshTimestamp();
            }
        });

        static::created(function (Conversation $conversation) {
            // display_id + uuid sinh từ DB (trigger/default) — nạp lại như
            // load_attributes_created_by_db_triggers của bản gốc.
            $fromDb = $conversation->newModelQuery()->whereKey($conversation->id)->first(['display_id', 'uuid']);
            $conversation->setAttribute('display_id', $fromDb->display_id);
            $conversation->setAttribute('uuid', $fromDb->uuid);
            $conversation->syncOriginalAttribute('display_id');
            $conversation->syncOriginalAttribute('uuid');
        });

        static::updated(function (Conversation $conversation) {
            // handle_resolved_status_change: resolve xong thì xóa waiting_since
            // bằng update_column (không chạy hook, không đổi updated_at).
            if ($conversation->wasChanged('status') && $conversation->status === self::STATUS_RESOLVED) {
                $conversation->newModelQuery()->whereKey($conversation->id)->toBase()->update(['waiting_since' => null]);
                $conversation->setAttribute('waiting_since', null);
                $conversation->syncOriginalAttribute('waiting_since');
            }
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

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function contactInbox(): BelongsTo
    {
        return $this->belongsTo(ContactInbox::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function statusName(): string
    {
        return self::STATUS_NAMES[$this->status];
    }

    public function priorityName(): ?string
    {
        return $this->priority === null ? null : self::PRIORITY_NAMES[$this->priority];
    }

    public function isSnoozed(): bool
    {
        return $this->status === self::STATUS_SNOOZED;
    }

    public function isResolved(): bool
    {
        return $this->status === self::STATUS_RESOLVED;
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function canReply(): bool
    {
        // Conversations::MessageWindowService — nhánh Channel::Api: chỉ giới hạn
        // khi channel đặt agent_reply_time_window; kênh khác chưa port → true.
        if ($this->inbox->channel_type !== 'Channel::Api') {
            return true;
        }

        $windowHours = $this->inbox->channel?->additional_attributes['agent_reply_time_window'] ?? null;

        if (blank($windowHours)) {
            return true;
        }

        $lastIncoming = $this->messages()->where('message_type', Message::TYPE_INCOMING)->latest('created_at')->first();

        if ($lastIncoming === null) {
            return false;
        }

        return now()->lt($lastIncoming->created_at->addHours((int) $windowHours));
    }

    /** @return HasMany<Message, $this> */
    public function unreadMessages(): HasMany
    {
        return $this->agent_last_seen_at !== null
            ? $this->messages()->where('created_at', '>', $this->agent_last_seen_at)
            : $this->messages();
    }

    /** @return HasMany<Message, $this> */
    public function assigneeUnreadMessages(): HasMany
    {
        return $this->assignee_last_seen_at !== null
            ? $this->messages()->where('created_at', '>', $this->assignee_last_seen_at)
            : $this->messages();
    }

    public function unreadIncomingMessagesCount(): int
    {
        return $this->unreadMessages()
            ->where('account_id', $this->account_id)
            ->where('message_type', Message::TYPE_INCOMING)
            ->count();
    }

    public function lastNonActivityMessage(): ?Message
    {
        return $this->messages()
            ->where('account_id', $this->account_id)
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->reorder('created_at', 'desc')
            ->first();
    }

    /** @return array<int, string> */
    public function cachedLabelListArray(): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $this->cached_label_list ?? ''))));
    }

    public function scopeUnassigned(Builder $query): Builder
    {
        return $query->whereNull('assignee_id')->whereNull('assignee_agent_bot_id');
    }

    public function scopeAssigned(Builder $query): Builder
    {
        return $query->where(fn (Builder $inner) => $inner
            ->whereNotNull('assignee_id')
            ->orWhereNotNull('assignee_agent_bot_id'));
    }

    public function scopeAssignedTo(Builder $query, User $agent): Builder
    {
        return $query->where('assignee_id', $agent->id);
    }

    public function scopeSortOnLastActivityAt(Builder $query, string $direction = 'desc'): Builder
    {
        return $query->orderBy('last_activity_at', $direction);
    }

    public function scopeSortOnCreatedAt(Builder $query, string $direction = 'asc'): Builder
    {
        return $query->orderBy('created_at', $direction);
    }

    public function scopeSortOnPriority(Builder $query, string $direction = 'desc'): Builder
    {
        return $query->orderByRaw('priority '.$this->sqlDirection($direction).' NULLS LAST, last_activity_at DESC');
    }

    public function scopeSortOnPriorityCreatedAt(Builder $query, string $direction = 'desc'): Builder
    {
        return $query->orderByRaw('priority '.$this->sqlDirection($direction).' NULLS LAST, created_at ASC');
    }

    public function scopeSortOnWaitingSince(Builder $query, string $direction = 'asc'): Builder
    {
        return $query->orderByRaw('(waiting_since IS NULL), waiting_since '.$this->sqlDirection($direction).', created_at ASC');
    }

    private function sqlDirection(string $direction): string
    {
        return strtolower($direction) === 'asc' ? 'ASC' : 'DESC';
    }

    private function validateRefererUrl(): void
    {
        $attributes = $this->additional_attributes;

        if (blank($attributes['referer'] ?? null)) {
            return;
        }

        if (! preg_match('/\Ahttps?:\/\//', (string) $attributes['referer'])
            || filter_var($attributes['referer'], FILTER_VALIDATE_URL) === false) {
            $attributes['referer'] = null;
            $this->additional_attributes = $attributes;
        }
    }
}
