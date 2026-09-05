<?php

namespace App\Models;

use Database\Factories\InboxAssignmentPolicyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/inbox_assignment_policy.rb — bảng nối
// một-một giữa inbox và chính sách phân công.
class InboxAssignmentPolicy extends Model
{
    /** @use HasFactory<InboxAssignmentPolicyFactory> */
    use HasFactory;

    protected $fillable = [
        'inbox_id',
        'assignment_policy_id',
    ];

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function assignmentPolicy(): BelongsTo
    {
        return $this->belongsTo(AssignmentPolicy::class);
    }
}
