<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/team_member.rb (bỏ invalidate unread count
// visibility — vào cùng B4; Audit::TeamMember là EE).
class TeamMember extends Model
{
    protected $fillable = ['team_id', 'user_id'];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
