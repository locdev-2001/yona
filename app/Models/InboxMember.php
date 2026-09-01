<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/inbox_member.rb.
// Round-robin queue + FilteredCountInvalidator để lại B4/B6 (cùng OnlineStatusTracker).
class InboxMember extends Model
{
    protected $fillable = [
        'inbox_id',
        'user_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }
}
