<?php

namespace App\Models;

use App\Services\Calls\InvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một người được đổ chuông trong một cuộc gọi và họ đã phản hồi thế nào. Ghi từ thao tác của
// người dùng (nghe, từ chối) và từ hết giờ đổ chuông, không từ sự kiện phòng.
class CallInvitation extends Model
{
    protected $fillable = ['call_id', 'user_id', 'status', 'rang_at', 'responded_at'];

    protected function casts(): array
    {
        return [
            'status' => InvitationStatus::class,
            'rang_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
