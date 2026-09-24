<?php

namespace App\Models;

use Database\Factories\AutomationRuleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// File attachments, reauthorization mail và custom attributes giữ nợ đúng biên D1/F1-E1.
class AutomationRule extends Model
{
    /** @use HasFactory<AutomationRuleFactory> */
    use HasFactory;

    public const EVENTS = [
        'conversation_created',
        'conversation_updated',
        'conversation_resolved',
        'message_created',
        'conversation_opened',
    ];

    public const EXECUTION_DELAY_MINUTES = 10;

    public const EXECUTION_DELAY_MAX_MINUTES = 43_200;

    public const DELAYED_CONVERSATION_ATTRIBUTES = ['status', 'inbox_id'];

    /** @var array<string, list<string>> */
    public const CONDITION_ATTRIBUTES = [
        'message_created' => [
            'message_type', 'private_note', 'content', 'email', 'inbox_id', 'status',
            'assignee_id', 'team_id', 'priority', 'conversation_language', 'phone_number',
            'company_name', 'labels',
        ],
        'conversation_created' => [
            'status', 'browser_language', 'mail_subject', 'country_code', 'phone_number',
            'company_name', 'referer', 'email', 'inbox_id', 'conversation_language',
            'priority', 'labels',
        ],
        'conversation_updated' => [
            'status', 'browser_language', 'mail_subject', 'country_code', 'referer',
            'phone_number', 'company_name', 'assignee_id', 'team_id', 'email', 'inbox_id',
            'conversation_language', 'priority', 'labels',
        ],
        'conversation_resolved' => [
            'status', 'browser_language', 'mail_subject', 'country_code', 'referer',
            'phone_number', 'company_name', 'assignee_id', 'team_id', 'email', 'inbox_id',
            'conversation_language', 'priority', 'labels',
        ],
        'conversation_opened' => [
            'status', 'browser_language', 'mail_subject', 'country_code', 'referer',
            'phone_number', 'company_name', 'assignee_id', 'team_id', 'email', 'inbox_id',
            'conversation_language', 'priority', 'labels',
        ],
    ];

    /** @var array<string, list<string>> */
    public const CONDITION_OPERATORS = [
        'message_type' => ['equal_to', 'not_equal_to'],
        'private_note' => ['equal_to', 'not_equal_to'],
        'content' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
        'email' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
        'phone_number' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain', 'starts_with'],
        'company_name' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
        'referer' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
        'mail_subject' => ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
        'status' => ['equal_to', 'not_equal_to'],
        'priority' => ['equal_to', 'not_equal_to'],
        'conversation_language' => ['equal_to', 'not_equal_to'],
        'browser_language' => ['equal_to', 'not_equal_to'],
        'country_code' => ['equal_to', 'not_equal_to'],
        'inbox_id' => ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
        'assignee_id' => ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
        'team_id' => ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
        'labels' => ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
    ];

    /** @var list<string> */
    public const SUPPORTED_ACTIONS = [
        'assign_agent', 'assign_team', 'remove_assigned_agent', 'remove_assigned_team',
        'add_label', 'remove_label', 'send_email_to_team', 'send_message', 'add_private_note', 'mute_conversation',
        'snooze_conversation', 'open_conversation', 'pending_conversation',
        'resolve_conversation', 'change_priority',
    ];

    /** @var list<string> */
    public const NO_PARAMETER_ACTIONS = [
        'remove_assigned_agent', 'remove_assigned_team', 'mute_conversation',
        'snooze_conversation', 'open_conversation', 'pending_conversation', 'resolve_conversation',
    ];

    protected $fillable = [
        'account_id', 'name', 'description', 'event_name', 'conditions', 'actions',
        'active', 'execution_delay',
    ];

    protected $attributes = [
        'conditions' => '[]',
        'actions' => '[]',
        'active' => true,
    ];

    protected function casts(): array
    {
        return [
            'conditions' => 'array',
            'actions' => 'array',
            'active' => 'boolean',
            'execution_delay' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::updated(function (AutomationRule $rule) {
            if (! $rule->executionConfigChanged()) {
                return;
            }

            $rule->pendingExecutions()->armed()->delete();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function pendingExecutions(): HasMany
    {
        return $this->hasMany(AutomationRulePendingExecution::class);
    }

    /** @return Builder<static> */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /** @return list<string> */
    public static function conditionAttributesFor(string $eventName): array
    {
        return self::CONDITION_ATTRIBUTES[$eventName] ?? [];
    }

    private function executionConfigChanged(): bool
    {
        return $this->wasChanged([
            'active', 'execution_delay', 'event_name', 'conditions', 'actions',
        ]);
    }
}
