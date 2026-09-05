<?php

namespace App\Models;

use Database\Factories\AssignmentPolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/assignment_policy.rb.
// enum assignment_order chỉ có round_robin ở CE (balanced là enterprise).
class AssignmentPolicy extends Model
{
    /** @use HasFactory<AssignmentPolicyFactory> */
    use HasFactory;

    public const DEFAULT_EXCLUDE_OLDER_THAN_HOURS = 168;

    public const ORDER_ROUND_ROBIN = 0;

    public const PRIORITY_EARLIEST_CREATED = 0;

    public const PRIORITY_LONGEST_WAITING = 1;

    protected $fillable = [
        'account_id',
        'name',
        'description',
        'assignment_order',
        'conversation_priority',
        'fair_distribution_limit',
        'fair_distribution_window',
        'enabled',
        'exclude_older_than_hours',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inboxAssignmentPolicies(): HasMany
    {
        return $this->hasMany(InboxAssignmentPolicy::class);
    }

    public function inboxes(): BelongsToMany
    {
        return $this->belongsToMany(Inbox::class, 'inbox_assignment_policies')->withTimestamps();
    }

    public function isLongestWaiting(): bool
    {
        return $this->conversation_priority === self::PRIORITY_LONGEST_WAITING;
    }
}
