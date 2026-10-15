<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một lần gọi API nhà cung cấp mô hình. Chứa nội dung hội thoại nên chỉ giữ
// RETENTION_DAYS ngày (model:prune hằng ngày, routes/console.php).
class ApiLog extends Model
{
    use MassPrunable;

    public const RETENTION_DAYS = 30;

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

    /** @return Builder<ApiLog> */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subDays(self::RETENTION_DAYS));
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
