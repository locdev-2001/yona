<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Concerns\AssignmentHandler;
use App\Models\Concerns\AutoAssignmentHandler;
use App\Models\Concerns\Labelable;
use App\Support\CurrentContact;
use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/conversation.rb (+ concerns ActivityMessageHandler,
// PriorityActivityMessageHandler, ConversationMuteHelpers).
// Bỏ: FilteredCountInvalidator (bộ đếm theo bộ lọc lưu — E1), csat (C5), agent bot/bot_handoff + SLA (EE/D4),
// campaigns (C4), activity theo Current.executed_by automation/contact (D1/C).
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use AssignmentHandler, AutoAssignmentHandler, HasFactory, Labelable;

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

    // notify_conversation_updation chỉ bắn CONVERSATION_UPDATED khi đổi các cột
    // này (list_of_keys) hoặc additional_attributes.conversation_language.
    public const UPDATED_EVENT_KEYS = [
        'team_id', 'assignee_id', 'assignee_agent_bot_id', 'status', 'snoozed_until', 'custom_attributes',
        'label_list', 'waiting_since', 'first_reply_created_at', 'priority',
    ];

    public const UPDATED_EVENT_ADDITIONAL_ATTRIBUTE_KEYS = ['conversation_language'];

    // unread_incoming_messages của bản gốc là `...last(10)` → mảng tối đa 10 phần tử,
    // và jbuilder đếm chính mảng đó nên unread_count trần ở 10 (badge FE hiện "9+").
    public const UNREAD_INCOMING_MESSAGES_LIMIT = 10;

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

    // label_list không phải cột: giữ [trước, sau] của lượt gắn nhãn đang chạy để
    // hook `updated` bắn event + activity giống previous_changes[:label_list] của gốc.
    /** @var array{0: array<int, string>, 1: array<int, string>}|null */
    private ?array $labelListChange = null;

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

            // Eloquent không syncChanges khi insert; Rails saved_change_to_*?
            // vẫn thấy assignee_id gán lúc tạo → đồng bộ để notifiable_assignee_change đúng.
            $conversation->syncChanges();

            // after_commit của AssignmentHandler đứng trước notify_conversation_creation
            // trong bản gốc; ở đây phải sau khi nạp display_id thì payload realtime
            // mới đủ dữ liệu.
            $conversation->runAssignmentCommitCallbacks();
            $conversation->dispatcherDispatch(EventType::CONVERSATION_CREATED);
        });

        static::updated(function (Conversation $conversation) {
            // handle_resolved_status_change: resolve xong thì xóa waiting_since
            // bằng update_column (không chạy hook, không đổi updated_at).
            if ($conversation->wasChanged('status') && $conversation->status === self::STATUS_RESOLVED) {
                $conversation->newModelQuery()->whereKey($conversation->id)->toBase()->update(['waiting_since' => null]);
                $conversation->setAttribute('waiting_since', null);
                $conversation->syncOriginalAttribute('waiting_since');
            }

            $conversation->notifyStatusChange();
            $conversation->createActivity();
            $conversation->notifyConversationUpdation();
        });
    }

    public function toggleStatus(): bool
    {
        $this->status = $this->isOpen() ? self::STATUS_RESOLVED : self::STATUS_OPEN;

        if ($this->status === self::STATUS_PENDING || $this->status === self::STATUS_SNOOZED) {
            $this->status = self::STATUS_OPEN;
        }

        return $this->save();
    }

    public function togglePriority(?string $priority = null): bool
    {
        $this->priority = self::priorityFromName(blank($priority) ? null : $priority);

        return $this->save();
    }

    public function mute(): void
    {
        if ($this->contact === null) {
            return;
        }

        $this->update(['status' => self::STATUS_RESOLVED]);
        $this->contact->update(['blocked' => true]);
        $this->createMuteChangeActivity('muted');
    }

    public function unmute(): void
    {
        if ($this->contact === null) {
            return;
        }

        $this->contact->update(['blocked' => false]);
        $this->createMuteChangeActivity('unmuted');
    }

    public function isMuted(): bool
    {
        return (bool) $this->contact?->blocked;
    }

    // notifiable_assignee_change?: giao cho người khác (không phải tự nhận).
    public function notifiableAssigneeChange(): bool
    {
        if (! $this->wasChanged('assignee_id') || $this->assignee_id === null) {
            return false;
        }

        return auth()->id() !== $this->assignee_id;
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

    public function conversationParticipants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function mentions(): HasMany
    {
        return $this->hasMany(Mention::class);
    }

    // Cổng DUY NHẤT tạo participant: thay validation ensure_inbox_access của
    // conversation_participant.rb. Trả null khi user không nằm trong
    // assignable_agents (inbox member + administrator) — đúng cách
    // `find_or_create_by` của bản gốc im lặng bỏ qua bản ghi không hợp lệ.
    public function addParticipant(int $userId): ?ConversationParticipant
    {
        $existing = $this->conversationParticipants()->where('user_id', $userId)->first();

        if ($existing !== null) {
            return $existing;
        }

        if (! $this->inbox->assignableAgents()->contains('id', $userId)) {
            return null;
        }

        return $this->conversationParticipants()->create(['user_id' => $userId]);
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

    /** @return Collection<int, Message> */
    public function unreadIncomingMessages(): Collection
    {
        return $this->unreadIncomingMessagesQuery()
            ->reorder('id', 'desc')
            ->limit(self::UNREAD_INCOMING_MESSAGES_LIMIT)
            ->get()
            ->reverse()
            ->values();
    }

    public function unreadIncomingMessagesCount(): int
    {
        return min(self::UNREAD_INCOMING_MESSAGES_LIMIT, $this->unreadIncomingMessagesQuery()->count());
    }

    /** @return HasMany<Message, $this> */
    private function unreadIncomingMessagesQuery(): HasMany
    {
        return $this->unreadMessages()
            ->where('account_id', $this->account_id)
            ->where('message_type', Message::TYPE_INCOMING);
    }

    public function lastNonActivityMessage(): ?Message
    {
        return $this->messages()
            ->where('account_id', $this->account_id)
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->reorder('created_at', 'desc')
            ->first();
    }

    // Chatwoot để acts_as_taggable_on ghi cached_label_list ngay trong lượt save
    // đổi nhãn; ở đây hook này là chỗ duy nhất đồng bộ cache + event + activity.
    protected function labelListChanged(array $previous, array $current): void
    {
        $this->cached_label_list = implode(', ', $current);
        $this->labelListChange = [$previous, $current];

        try {
            $this->save();
        } finally {
            $this->labelListChange = null;
        }
    }

    // Đổi tên nhãn không đi qua updateLabels (liên kết không đổi) nên cache phải
    // được dựng lại qua đúng seam labelListChanged để event/activity giống gốc.
    public function refreshCachedLabelList(): void
    {
        $previous = $this->cachedLabelListArray();
        $current = $this->labelList();

        if ($current !== $previous) {
            $this->labelListChanged($previous, $current);
        }
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

    // conversation.rb scope :unattended — chưa có trả lời đầu HOẶC đang chờ khách.
    public function scopeUnattended(Builder $query): Builder
    {
        return $query->where(fn (Builder $inner) => $inner
            ->whereNull('first_reply_created_at')
            ->orWhereNotNull('waiting_since'));
    }

    // scope :sort_on_unread bỏ qua hướng truyền vào (`|_direction|`) — luôn nhiều
    // tin chưa đọc nhất trước, tiebreak last_activity_at DESC.
    public function scopeSortOnUnread(Builder $query, string $direction = 'desc'): Builder
    {
        return $query
            ->orderByRaw(self::unreadMessagesCountSql().' DESC')
            ->sortOnLastActivityAt('desc');
    }

    // scope :last_user_message_at — DISTINCT ON lấy tin mới nhất mỗi hội thoại rồi
    // xếp theo message_type (incoming trước) và thời điểm tin đó. Bản gốc chỉ dùng
    // cho danh sách Mentions; chưa nối vào SORT_OPTIONS (B11).
    public function scopeLastUserMessageAt(Builder $query): Builder
    {
        $lastMessagePerConversation = 'SELECT DISTINCT ON (conversation_id) conversation_id, id, created_at, message_type'
            .' FROM messages ORDER BY conversation_id, created_at DESC';

        return $query
            ->select('conversations.*')
            ->join(
                DB::raw("($lastMessagePerConversation) AS grouped_conversations"),
                'grouped_conversations.conversation_id',
                '=',
                'conversations.id'
            )
            ->orderBy('grouped_conversations.message_type')
            ->orderBy('grouped_conversations.created_at');
    }

    // conversation.rb#unread_messages_count_arel — subquery tương quan đếm tin
    // incoming chưa đọc theo mốc agent_last_seen_at. Nguồn duy nhất của điều kiện
    // "chưa đọc" phía SQL (sort unread + bộ đếm sidebar dùng chung).
    public static function unreadMessagesCountSql(string $conversationsTable = 'conversations'): string
    {
        return '(SELECT COUNT(messages.id) FROM messages'
            ." WHERE messages.conversation_id = $conversationsTable.id"
            ." AND messages.account_id = $conversationsTable.account_id"
            .' AND messages.message_type = '.Message::TYPE_INCOMING
            ." AND ($conversationsTable.agent_last_seen_at IS NULL"
            ." OR messages.created_at > $conversationsTable.agent_last_seen_at))";
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

    private function notifyConversationUpdation(): void
    {
        $previousChanges = PreviousChanges::of($this);

        if ($this->labelListChange !== null) {
            $previousChanges['label_list'] = $this->labelListChange;
        }

        if ($previousChanges === [] || ! $this->allowedKeys($previousChanges)) {
            return;
        }

        $this->dispatcherDispatch(EventType::CONVERSATION_UPDATED, $previousChanges);
    }

    /** @param array<string, array{0: mixed, 1: mixed}> $previousChanges */
    private function allowedKeys(array $previousChanges): bool
    {
        if (array_intersect(array_keys($previousChanges), self::UPDATED_EVENT_KEYS) !== []) {
            return true;
        }

        [$before, $after] = $previousChanges['additional_attributes'] ?? [[], []];

        foreach (self::UPDATED_EVENT_ADDITIONAL_ATTRIBUTE_KEYS as $key) {
            if (array_key_exists($key, (array) $before) || array_key_exists($key, (array) $after)) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, array{0: mixed, 1: mixed}>|null $changedAttributes */
    private function dispatcherDispatch(EventType $type, ?array $changedAttributes = null): void
    {
        DomainEvent::dispatch($type, [
            'conversation' => $this,
            'notifiable_assignee_change' => $this->notifiableAssigneeChange(),
            'changed_attributes' => $changedAttributes,
            'performed_by' => auth()->user(),
        ]);
    }

    // notify_status_change: mỗi event bắn khi điều kiện của nó đúng.
    private function notifyStatusChange(): void
    {
        $statusChanged = $this->wasChanged('status');

        $conditions = [
            EventType::CONVERSATION_OPENED->value => $statusChanged && $this->isOpen(),
            EventType::CONVERSATION_RESOLVED->value => $statusChanged && $this->isResolved(),
            EventType::CONVERSATION_STATUS_CHANGED->value => $statusChanged,
            EventType::CONVERSATION_READ->value => $this->wasChanged('contact_last_seen_at'),
            EventType::CONVERSATION_CONTACT_CHANGED->value => $this->wasChanged('contact_id'),
        ];

        foreach ($conditions as $event => $condition) {
            if ($condition) {
                $this->dispatcherDispatch(EventType::from($event));
            }
        }
    }

    // ActivityMessageHandler#create_activity — nhánh status + priority.
    private function createActivity(): void
    {
        $userName = auth()->user()?->name;

        if ($this->wasChanged('status')) {
            $this->statusChangeActivity($userName);
        }

        if ($this->wasChanged('priority')) {
            $this->priorityChangeActivity($userName);
        }

        if ($this->labelListChange !== null) {
            $this->labelChangeActivity($this->activityMessageOwner($userName));
        }
    }

    // LabelActivityMessageHandler#create_label_added/#create_label_removed.
    private function labelChangeActivity(?string $userName): void
    {
        if ($userName === null || $this->labelListChange === null) {
            return;
        }

        [$previous, $current] = $this->labelListChange;

        $this->labelChangeActivityMessage('added', $userName, array_values(array_diff($current, $previous)));
        $this->labelChangeActivityMessage('removed', $userName, array_values(array_diff($previous, $current)));
    }

    /** @param array<int, string> $labels */
    private function labelChangeActivityMessage(string $changeType, string $userName, array $labels): void
    {
        if ($labels === []) {
            return;
        }

        $content = __('conversations.activity.labels.'.$changeType, [
            'user_name' => $userName,
            'labels' => implode(', ', $labels),
        ]);

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content));
    }

    private function statusChangeActivity(?string $userName): void
    {
        $content = $this->userStatusChangeActivityContent($userName);

        if (blank($content)) {
            return;
        }

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content, [
            'activity' => ['type' => 'conversation_status_changed', 'status' => $this->statusName()],
        ]));
    }

    private function userStatusChangeActivityContent(?string $userName): ?string
    {
        if ($userName !== null) {
            return __('conversations.activity.status.'.$this->statusName(), ['user_name' => $userName]);
        }

        // Khách tự bấm "End conversation" trong widget: không có agent nào đứng
        // sau thay đổi này, chủ thể là chính khách.
        $contact = CurrentContact::get();

        if ($contact !== null && $this->isResolved()) {
            return __('conversations.activity.status.contact_resolved', [
                'contact_name' => Str::ucfirst((string) $contact->name),
            ]);
        }

        if ($this->isResolved()) {
            ['key' => $key, 'count' => $count] = $this->autoResolveMessageKey((int) ($this->account->settings['auto_resolve_after'] ?? 0));

            return __('conversations.activity.status.'.$key, ['count' => $count]);
        }

        return null;
    }

    /** @return array{key: string, count: int} */
    private function autoResolveMessageKey(int $minutes): array
    {
        if ($minutes >= 1440 && $minutes % 1440 === 0) {
            return ['key' => 'auto_resolved_days', 'count' => intdiv($minutes, 1440)];
        }

        if ($minutes >= 60 && $minutes % 60 === 0) {
            return ['key' => 'auto_resolved_hours', 'count' => intdiv($minutes, 60)];
        }

        return ['key' => 'auto_resolved_minutes', 'count' => $minutes];
    }

    private function priorityChangeActivity(?string $userName): void
    {
        $oldPriority = self::PRIORITY_NAMES[$this->getOriginal('priority')] ?? null;
        $newPriority = $this->priorityName();

        if ($oldPriority === null && $newPriority === null) {
            return;
        }

        $changeType = match (true) {
            $oldPriority !== null && $newPriority !== null => 'updated',
            $newPriority !== null => 'added',
            default => 'removed',
        };

        $content = __('conversations.activity.priority.'.$changeType, [
            'user_name' => $userName,
            'new_priority' => $newPriority,
            'old_priority' => $oldPriority,
        ]);

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content));
    }

    private function createMuteChangeActivity(string $changeType): void
    {
        $user = auth()->user();

        if ($user === null) {
            return;
        }

        $content = __('conversations.activity.'.$changeType, ['user_name' => $user->name]);

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content));
    }

    private function activityMessageParams(string $content, ?array $contentAttributes = null): array
    {
        $params = [
            'account_id' => $this->account_id,
            'inbox_id' => $this->inbox_id,
            'message_type' => Message::TYPE_ACTIVITY,
            'content' => $content,
        ];

        if (filled($contentAttributes)) {
            $params['content_attributes'] = $contentAttributes;
        }

        return $params;
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
