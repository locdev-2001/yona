<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use App\Services\AutoAssignment\InboxRoundRobinService;
use App\Support\OnlineStatusTracker;
use Database\Factories\InboxFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Collection as SupportCollection;

// Port từ refs/chatwoot/app/models/inbox.rb.
// Bỏ ở B1: campaigns/contact_inboxes/conversations/messages (nhóm B2-B3),
// working hours OutOfOffisable (tính năng sau), agent_bot/webhooks/portal (nhóm D-E),
// FilteredCountInvalidator (nợ B8), Reportable, EE overlay.
class Inbox extends Model
{
    /** @use HasFactory<InboxFactory> */
    use Avatarable, HasFactory;

    public const SENDER_NAME_TYPE_FRIENDLY = 0;

    public const SENDER_NAME_TYPE_PROFESSIONAL = 1;

    protected $fillable = [
        'account_id',
        'channel_id',
        'channel_type',
        'name',
        'greeting_enabled',
        'greeting_message',
        'enable_email_collect',
        'csat_survey_enabled',
        'enable_auto_assignment',
        'auto_assignment_config',
        'working_hours_enabled',
        'out_of_office_message',
        'timezone',
        'allow_messages_after_resolved',
        'lock_to_single_conversation',
        'portal_id',
        'sender_name_type',
        'business_name',
        'csat_config',
    ];

    // Mặc định của cột trong DB, nhắc lại ở model vì Eloquent không đọc default
    // của Postgres: bản ghi vừa create phải trả về đúng giá trị như ActiveRecord.
    protected $attributes = [
        'enable_auto_assignment' => true,
        'greeting_enabled' => false,
        'working_hours_enabled' => false,
        'timezone' => 'UTC',
        'enable_email_collect' => true,
        'csat_survey_enabled' => false,
        'allow_messages_after_resolved' => true,
        'auto_assignment_config' => '{}',
        'lock_to_single_conversation' => false,
        'sender_name_type' => self::SENDER_NAME_TYPE_FRIENDLY,
        'csat_config' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'greeting_enabled' => 'boolean',
            'enable_email_collect' => 'boolean',
            'csat_survey_enabled' => 'boolean',
            'enable_auto_assignment' => 'boolean',
            'working_hours_enabled' => 'boolean',
            'allow_messages_after_resolved' => 'boolean',
            'lock_to_single_conversation' => 'boolean',
            'auto_assignment_config' => 'array',
            'csat_config' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // belongs_to :channel, dependent: :destroy — xóa inbox kéo theo kênh
        // và avatar (inbox_members đã cascade bằng FK).
        static::deleted(function (Inbox $inbox) {
            $inbox->channel?->delete();
            $inbox->avatar?->delete();
            (new InboxRoundRobinService($inbox))->clearQueue();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function channel(): MorphTo
    {
        return $this->morphTo();
    }

    public function inboxMembers(): HasMany
    {
        return $this->hasMany(InboxMember::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function inboxAssignmentPolicy(): HasOne
    {
        return $this->hasOne(InboxAssignmentPolicy::class);
    }

    public function assignmentPolicy(): HasOneThrough
    {
        return $this->hasOneThrough(
            AssignmentPolicy::class,
            InboxAssignmentPolicy::class,
            'inbox_id',
            'id',
            'id',
            'assignment_policy_id',
        );
    }

    public function contactInboxes(): HasMany
    {
        return $this->hasMany(ContactInbox::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'inbox_members')->withTimestamps();
    }

    public function scopeOrderByName(Builder $query): Builder
    {
        return $query->orderByRaw('lower(name) ASC');
    }

    /** @param list<int> $userIds */
    public function addMembers(array $userIds): void
    {
        foreach ($userIds as $userId) {
            $this->inboxMembers()->create(['user_id' => $userId]);
        }
    }

    /** @param list<int> $userIds */
    public function removeMembers(array $userIds): void
    {
        // destroy_all của bản gốc — xóa từng bản ghi để hook cập nhật hàng đợi
        // round-robin chạy.
        $this->inboxMembers()->whereIn('user_id', $userIds)->get()->each->delete();
    }

    // InboxAgentAvailability#member_ids_with_assignment_capacity — CE không giới
    // hạn sức chứa nên là toàn bộ member.
    /** @return list<int> */
    public function memberIdsWithAssignmentCapacity(): array
    {
        return $this->inboxMembers()->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }

    public function autoAssignmentV2Enabled(): bool
    {
        return $this->account->featureEnabled('assignment_v2');
    }

    public function isApi(): bool
    {
        return $this->channel_type === 'Channel::Api';
    }

    public function isWebWidget(): bool
    {
        return $this->channel_type === 'Channel::WebWidget';
    }

    // InboxAgentAvailability#available_agents: member của inbox đang 'online'
    // theo OnlineStatusTracker (dùng cho round-robin B6).
    /** @return Collection<int, InboxMember> */
    public function availableAgents(): Collection
    {
        $onlineAgentIds = collect(OnlineStatusTracker::getAvailableUsers($this->account_id))
            ->filter(fn (string $status) => $status === 'online')
            ->keys()
            ->map(fn (int|string $userId) => (int) $userId)
            ->all();

        if ($onlineAgentIds === []) {
            return new Collection;
        }

        return $this->inboxMembers()
            ->whereIn('user_id', $onlineAgentIds)
            ->whereHas('user')
            ->with('user')
            ->get();
    }

    // Inbox#assignable_agents: member của inbox + mọi administrator, không trùng.
    /** @return Collection<int, User> */
    public function assignableAgents(): Collection
    {
        return self::assignableAgentsForInboxes(new Collection([$this]), $this->account);
    }

    /**
     * assignable_agents_controller.rb: giao member của MỌI inbox được chọn, hợp
     * với toàn bộ administrator. Một inbox là trường hợp riêng của phép giao này
     * nên hai đường đọc dùng chung một chỗ.
     *
     * @param  SupportCollection<int, Inbox>|Collection<int, Inbox>  $inboxes
     * @return Collection<int, User>
     */
    public static function assignableAgentsForInboxes(SupportCollection|Collection $inboxes, Account $account): Collection
    {
        $administratorIds = $account->accountUsers()
            ->where('role', AccountUser::ROLE_ADMINISTRATOR)
            ->orderBy('user_id')
            ->pluck('user_id');

        $memberIds = collect($inboxes)
            ->map(fn (Inbox $inbox) => $inbox->inboxMembers()->orderBy('user_id')->pluck('user_id'))
            ->reduce(
                fn (?SupportCollection $shared, SupportCollection $ids) => $shared === null ? $ids : $shared->intersect($ids)->values(),
            ) ?? collect();

        // Gốc nối hai truy vấn (member trước, administrator sau) rồi uniq — giữ
        // đúng thứ tự đó thay vì để PostgreSQL tự quyết, không thì danh sách gán
        // đổi chỗ giữa các lần đọc.
        $orderedIds = $memberIds->merge($administratorIds)->unique()->values();

        return User::query()
            ->whereIn('id', $orderedIds)
            ->get()
            ->sortBy(fn (User $user) => $orderedIds->search($user->id))
            ->values();
    }
}
