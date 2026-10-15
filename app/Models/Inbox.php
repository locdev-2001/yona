<?php

namespace App\Models;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Models\Concerns\Avatarable;
use App\Models\Concerns\OutOfOffisable;
use App\Models\Concerns\Reportable;
use App\Models\Concerns\SharesRequestModels;
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
use Illuminate\Support\Str;

// Bỏ ở B1: contact_inboxes/conversations/messages (nhóm B2-B3),
// agent_bot/webhooks/portal (nhóm D-E),
// FilteredCountInvalidator (nợ B8), EE overlay.
class Inbox extends Model
{
    /** @use HasFactory<InboxFactory> */
    use Avatarable, HasFactory, OutOfOffisable, Reportable, SharesRequestModels;

    public const SENDER_NAME_TYPE_FRIENDLY = 0;

    public const SENDER_NAME_TYPE_PROFESSIONAL = 1;

    // Múi giờ của hộp thư mới: khách hàng của Yona là shop Việt, tính giờ làm việc theo giờ Việt Nam.
    public const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

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
        'timezone' => self::DEFAULT_TIMEZONE,
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
        // Xóa kênh TRƯỚC hàng inbox: nếu bước này hỏng thì cả lệnh xóa dừng lại,
        // không để lại hàng channel_* mồ côi giữ ràng buộc unique (email, phone_number…).
        static::deleting(function (Inbox $inbox) {
            Attachment::purgeForMessages($inbox->messages()->getQuery());
            $inbox->channel?->delete();
            $inbox->avatar?->delete();
        });

        static::deleted(function (Inbox $inbox) {
            (new InboxRoundRobinService($inbox))->clearQueue();
        });
    }

    /** Help Center gắn với hộp thư — widget đọc bài ngay trong khung chat. */
    public function portal(): BelongsTo
    {
        return $this->belongsTo(Portal::class);
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

    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    public function hooks(): HasMany
    {
        return $this->hasMany(Integrations\Hook::class);
    }

    public function agentBotInbox(): HasOne
    {
        return $this->hasOne(AgentBotInbox::class);
    }

    // InboxBotStatus#active_bot? — CE chỉ còn nhánh agent bot (dialogflow là EE).
    public function activeBot(): bool
    {
        return $this->agentBotInbox?->isActive() === true;
    }

    public function agentBot(): HasOneThrough
    {
        return $this->hasOneThrough(
            AgentBot::class,
            AgentBotInbox::class,
            'inbox_id',
            'id',
            'id',
            'agent_bot_id',
        );
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function contactInboxes(): HasMany
    {
        return $this->hasMany(ContactInbox::class);
    }

    // AI agent phụ trách inbox; gắn/gỡ chỉ qua AiAgentService::assignInbox.
    public function aiAgent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class);
    }

    // Luật DUY NHẤT của "AI nào trả lời hội thoại tự động của inbox": AI của inbox, đang bật.
    // Dịch vụ gọi ->first() để luôn đọc mới; resource dùng bản nạp sẵn cho cả trang.
    public function replyingAiAgent(): BelongsTo
    {
        return $this->aiAgent()->where('enabled', true);
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

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    // Inbox#inbox_type — tên người-đọc-được của kênh ('Website', 'API'…);
    // campaign dùng nó để quyết định loại chiến dịch được phép.
    // Inbox#webhook_data — khối `inbox` rút gọn trong payload webhook.
    public function webhookData(): array
    {
        return ['id' => $this->id, 'name' => $this->name];
    }

    public function inboxType(): string
    {
        return $this->channel?->name() ?? '';
    }

    /**
     * Cửa DUY NHẤT để lõi và UI hỏi kênh làm được gì
     * (docs/channel-capabilities.md §1.2). Kênh chưa khai = coi như không hỗ trợ,
     * lõi ẩn tính năng chứ không nổ.
     */
    public function capabilities(): CapabilitySet
    {
        $channel = $this->channel;

        return $channel instanceof DeclaresCapabilities ? $channel->capabilities() : CapabilitySet::none();
    }

    public function supports(Capability $capability): bool
    {
        return $this->capabilities()->has($capability);
    }

    /** Cửa DUY NHẤT để lõi và UI hỏi hộp thư thuộc nền tảng nào. Kênh chưa khai = unknown, không nổ. */
    public function platform(): ChannelPlatform
    {
        $channel = $this->channel;

        return $channel instanceof DeclaresPlatform ? $channel->platform() : ChannelPlatform::unknown();
    }

    public function isApi(): bool
    {
        return $this->channel_type === 'Channel::Api';
    }

    public function isWebWidget(): bool
    {
        return $this->channel_type === 'Channel::WebWidget';
    }

    /**
     * Contract lõi cho sidebar/thẻ hội thoại: hộp thư có đang cần người dùng đăng
     * nhập lại không. Lõi KHÔNG biết tên kênh nào — chỉ hỏi kênh nào khai năng lực
     * `session_reauth` (docs/channel-capabilities.md §2.5).
     */
    public function reauthorizationRequired(): bool
    {
        if (! $this->supports(Capability::SessionReauth)) {
            return false;
        }

        $channel = $this->channel;

        return $channel !== null
            && method_exists($channel, 'reauthorizationRequired')
            && $channel->reauthorizationRequired();
    }

    public function isZalo(): bool
    {
        return $this->channel_type === 'Channel::Zalo';
    }

    public function isEmail(): bool
    {
        return $this->channel_type === 'Channel::Email';
    }

    // Inbox#sanitized_name / #sanitized_business_name — tên dùng làm display name
    // của header From, đã gỡ ký tự làm hỏng cú pháp địa chỉ thư.
    public function sanitizedName(): string
    {
        if (blank($this->name)) {
            return $this->isEmail() ? $this->displayNameFromEmail() : '';
        }

        $sanitized = self::applySanitizationRules($this->name);

        return $sanitized === '' && $this->isEmail() ? $this->displayNameFromEmail() : $sanitized;
    }

    // Chưa đặt tên doanh nghiệp thì lấy tên hộp; tên hộp là một địa chỉ email (hộp Gmail nối
    // bằng Đăng nhập Google) thì lấy tên tài khoản, không để ra chuỗi kiểu "robertnguyenyona.vn".
    public function sanitizedBusinessName(): string
    {
        $sanitized = blank($this->business_name) ? '' : self::applySanitizationRules($this->business_name);

        if ($sanitized !== '') {
            return $sanitized;
        }

        return filter_var($this->name, FILTER_VALIDATE_EMAIL) === false
            ? $this->sanitizedName()
            : self::applySanitizationRules((string) $this->account?->name);
    }

    private function displayNameFromEmail(): string
    {
        $localPart = explode('@', (string) $this->channel?->email)[0];

        return Str::of($localPart)->replaceMatches('/[^a-zA-Z0-9]+/', ' ')->squish()->title()->value();
    }

    private static function applySanitizationRules(string $name): string
    {
        $sanitized = preg_replace('/[\\<>@"!#$%&*+=?^`{|}~:;()]/', '', $name);
        $sanitized = preg_replace('/[\x00-\x1F\x7F]/', ' ', (string) $sanitized);
        $sanitized = preg_replace('/^[[:punct:]]+|[[:punct:]]+$/u', '', (string) $sanitized);

        return Str::of((string) $sanitized)->squish()->value();
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
