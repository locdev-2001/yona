<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use Database\Factories\InboxFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// Port từ refs/chatwoot/app/models/inbox.rb.
// Bỏ ở B1: campaigns/contact_inboxes/conversations/messages (nhóm B2-B3),
// working hours OutOfOffisable (tính năng sau), agent_bot/webhooks/portal (nhóm D-E),
// round-robin + FilteredCountInvalidator (nợ B4/B6), Reportable, EE overlay.
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
        $this->inboxMembers()->whereIn('user_id', $userIds)->delete();
    }

    public function isApi(): bool
    {
        return $this->channel_type === 'Channel::Api';
    }

    // Inbox#assignable_agents: member của inbox + mọi administrator, không trùng.
    /** @return Collection<int, User> */
    public function assignableAgents(): Collection
    {
        $administratorIds = $this->account->accountUsers()
            ->where('role', AccountUser::ROLE_ADMINISTRATOR)
            ->pluck('user_id');

        return User::query()
            ->whereIn('id', $this->inboxMembers()->pluck('user_id')->merge($administratorIds)->unique())
            ->get();
    }
}
