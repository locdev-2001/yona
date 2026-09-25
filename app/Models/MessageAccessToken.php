<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Vé một-lần (hoặc nhiều lần với trang chỉ xem) mở trang công khai `/m/{token}`.
// Không có tài khoản đứng sau — token trên URL LÀ danh tính duy nhất.
class MessageAccessToken extends Model
{
    protected $fillable = [
        'message_id',
        'purpose',
        'item_id',
        'token_hash',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return $this->consumed_at !== null;
    }
}
