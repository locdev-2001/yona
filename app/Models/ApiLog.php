<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một lần gọi API nhà cung cấp mô hình, giữ vĩnh viễn để đối chiếu. Số liệu tổng kết
// (trang Phân tích AI) đọc ai_usage_analytics, không đọc bảng này.
class ApiLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'account_id',
        'conversation_id',
        'ai_agent_id',
        'provider',
        'model',
        'http_status',
        'error_code',
        'request',
        'response',
        'input_tokens',
        'output_tokens',
        'cache_read_tokens',
        'cache_write_tokens',
        'cost_micro_usd',
        'latency_ms',
    ];

    protected function casts(): array
    {
        return [
            'request' => 'array',
            'response' => 'array',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function aiAgent(): BelongsTo
    {
        return $this->belongsTo(AiAgent::class);
    }
}
