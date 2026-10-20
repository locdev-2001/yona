<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một lần một người vào phòng; `left_at` NULL = đang ở trong phòng. Chỉ ghi từ sự kiện
// phòng của nhà cung cấp media, không ghi từ client. `identity` là định danh trung tính
// (`user:{id}` | `guest:{key}`); `user_id` chỉ có khi người đó là người dùng Yona.
class CallParticipant extends Model
{
    protected $fillable = ['call_id', 'user_id', 'identity', 'display_name', 'joined_at', 'left_at'];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
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
