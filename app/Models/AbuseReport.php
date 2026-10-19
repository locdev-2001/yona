<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbuseReport extends Model
{
    public const STATUS_OPEN = 1;

    public const STATUS_HANDLED = 2;

    public const STATUS_DISMISSED = 3;

    public const REASONS = ['spam', 'harassment', 'inappropriate', 'scam', 'other'];

    // Thứ bị báo cáo → model; khoá là giá trị client gửi lên.
    public const REPORTABLE = [
        'user' => User::class,
        'chat' => Chat::class,
        'message' => ChatMessage::class,
    ];

    protected $fillable = ['reporter_id', 'reportable_type', 'reportable_id', 'reason', 'note', 'status', 'handled_by', 'handled_at'];

    protected function casts(): array
    {
        return ['handled_at' => 'datetime'];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
