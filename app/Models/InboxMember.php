<?php

namespace App\Models;

use App\Services\AutoAssignment\InboxRoundRobinService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/inbox_member.rb.
// FilteredCountInvalidator để lại B8.
class InboxMember extends Model
{
    protected $fillable = [
        'inbox_id',
        'user_id',
    ];

    protected static function booted(): void
    {
        static::created(function (InboxMember $member) {
            (new InboxRoundRobinService($member->inbox))->addAgentToQueue((int) $member->user_id);
        });

        static::deleted(function (InboxMember $member) {
            $inbox = $member->inbox;

            if ($inbox !== null) {
                (new InboxRoundRobinService($inbox))->removeAgentFromQueue((int) $member->user_id);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }
}
