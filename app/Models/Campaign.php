<?php

namespace App\Models;

use Database\Factories\CampaignFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// Port từ refs/chatwoot/app/models/campaign.rb.
// Bỏ: trigger!/execute_campaign (one_off — kênh SMS/WhatsApp chưa port, E4),
// invalidate_filtered_unread_count_filters (bộ đếm theo bộ lọc — E1).
class Campaign extends Model
{
    /** @use HasFactory<CampaignFactory> */
    use HasFactory;

    public const TYPE_ONGOING = 0;

    public const TYPE_ONE_OFF = 1;

    public const TYPE_NAMES = [
        self::TYPE_ONGOING => 'ongoing',
        self::TYPE_ONE_OFF => 'one_off',
    ];

    public const STATUS_ACTIVE = 0;

    public const STATUS_COMPLETED = 1;

    public const STATUS_PROCESSING = 2;

    public const STATUS_NAMES = [
        self::STATUS_ACTIVE => 'active',
        self::STATUS_COMPLETED => 'completed',
        self::STATUS_PROCESSING => 'processing',
    ];

    // validate_campaign_inbox: chỉ 4 loại inbox nhận campaign.
    public const SUPPORTED_INBOX_TYPES = ['Website', 'Twilio SMS', 'Sms', 'Whatsapp'];

    // ensure_correct_campaign_attributes: 3 loại inbox này luôn là one_off và
    // phải có scheduled_at; còn lại (Website) luôn là ongoing, scheduled_at rỗng.
    public const ONE_OFF_INBOX_TYPES = ['Twilio SMS', 'Sms', 'Whatsapp'];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'sender_id',
        'title',
        'description',
        'message',
        'enabled',
        'trigger_rules',
        'trigger_only_during_business_hours',
        'campaign_type',
        'campaign_status',
        'audience',
        'scheduled_at',
        'template_params',
    ];

    // Default của Postgres không tự về model mới tạo — nhắc lại để phản hồi của
    // POST khớp ActiveRecord.
    protected $attributes = [
        'enabled' => true,
        'campaign_type' => self::TYPE_ONGOING,
        'campaign_status' => self::STATUS_ACTIVE,
        'trigger_only_during_business_hours' => false,
        'trigger_rules' => '{}',
        'audience' => '[]',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'trigger_only_during_business_hours' => 'boolean',
            'trigger_rules' => 'array',
            'audience' => 'array',
            'template_params' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Campaign $campaign) {
            $campaign->ensureCorrectCampaignAttributes();

            // prevent_completed_campaign_from_update — validation của model gốc,
            // giữ ở model để mọi cửa ghi đều bị chặn; ValidationException cho ra
            // đúng 422 ở tầng HTTP mà controller không phải biết luật này.
            if ($campaign->exists && ! $campaign->isDirty('campaign_status') && $campaign->isCompleted()) {
                throw ValidationException::withMessages(['status' => 'The campaign is already completed']);
            }

            // before_update :set_completed_at, if: :marking_completed?
            if ($campaign->exists && $campaign->isDirty('campaign_status') && $campaign->isCompleted()) {
                $campaign->completed_at ??= $campaign->freshTimestamp();
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

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function typeName(): string
    {
        return self::TYPE_NAMES[$this->campaign_type] ?? 'ongoing';
    }

    public function statusName(): string
    {
        return self::STATUS_NAMES[$this->campaign_status] ?? 'active';
    }

    public function isOngoing(): bool
    {
        return $this->campaign_type === self::TYPE_ONGOING;
    }

    public function isCompleted(): bool
    {
        return $this->campaign_status === self::STATUS_COMPLETED;
    }

    /**
     * Luật của campaign khai ở model — controller chỉ ghép vào `validate()`, nên
     * mọi cửa vào (dashboard API hôm nay, Platform API sau này) cùng một bộ luật.
     * `$targetInbox` là inbox mà bản ghi sẽ trỏ tới sau lượt ghi này (inbox_id
     * gửi lên, hoặc inbox đang gắn khi sửa mà không đổi inbox).
     *
     * @return array<string, mixed>
     */
    public static function validationRules(Account $account, ?Inbox $targetInbox, ?self $campaign = null): array
    {
        $requiredOnCreate = $campaign === null ? 'required' : 'sometimes';

        return [
            'title' => [$requiredOnCreate, 'string'],
            'message' => [$requiredOnCreate, 'string'],
            'description' => ['sometimes', 'nullable', 'string'],
            'enabled' => ['sometimes', 'boolean'],
            'trigger_only_during_business_hours' => ['sometimes', 'boolean'],
            // inbox_must_belong_to_account + validate_campaign_inbox.
            'inbox_id' => [
                $requiredOnCreate,
                Rule::exists('inboxes', 'id')->where('account_id', $account->id),
                fn (string $attribute, mixed $value, callable $fail) => self::guardInboxType($account, $value, $fail),
            ],
            // sender_must_belong_to_account.
            'sender_id' => [
                'sometimes',
                'nullable',
                Rule::exists('account_users', 'user_id')->where('account_id', $account->id),
            ],
            'trigger_rules' => ['sometimes', 'array'],
            'trigger_rules.url' => [
                'sometimes',
                'nullable',
                'string',
                fn (string $attribute, mixed $value, callable $fail) => self::guardTriggerUrl($targetInbox, $value, $fail),
            ],
            'trigger_rules.time_on_page' => ['sometimes', 'nullable', 'numeric'],
            'audience' => ['sometimes', 'array'],
            'audience.*.id' => ['required_with:audience', 'integer'],
            'audience.*.type' => ['required_with:audience', 'string'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
            'template_params' => ['sometimes', 'nullable', 'array'],
        ];
    }

    private static function guardInboxType(Account $account, mixed $inboxId, callable $fail): void
    {
        $inbox = Inbox::query()->where('account_id', $account->id)->find($inboxId);

        if ($inbox !== null && ! in_array($inbox->inboxType(), self::SUPPORTED_INBOX_TYPES, true)) {
            $fail('Unsupported Inbox type');
        }
    }

    // validate_url: inbox Website bắt buộc http(s) — pattern URL của widget chạy
    // qua `new URLPattern(...)` nên schema phải rõ ràng.
    private static function guardTriggerUrl(?Inbox $targetInbox, mixed $url, callable $fail): void
    {
        if (blank($url) || ! $targetInbox?->isWebWidget()) {
            return;
        }

        if (! str_starts_with((string) $url, 'http://') && ! str_starts_with((string) $url, 'https://')) {
            $fail('invalid');
        }
    }

    // ensure_correct_campaign_attributes — loại inbox quyết định campaign_type,
    // không phải tham số người dùng gửi lên.
    private function ensureCorrectCampaignAttributes(): void
    {
        $inboxType = $this->inbox?->inboxType();

        if ($inboxType === null) {
            return;
        }

        if (in_array($inboxType, self::ONE_OFF_INBOX_TYPES, true)) {
            $this->campaign_type = self::TYPE_ONE_OFF;
            $this->scheduled_at ??= now();

            return;
        }

        $this->campaign_type = self::TYPE_ONGOING;
        $this->scheduled_at = null;
    }
}
