<?php

namespace App\Models;

use Database\Factories\DashboardAppFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một trang web nhúng vào
// khung hội thoại dưới dạng tab.
class DashboardApp extends Model
{
    /** @use HasFactory<DashboardAppFactory> */
    use HasFactory;

    // validate_content của bản gốc — lược đồ nội dung, cũng dùng ở tầng nhận input.
    public const CONTENT_SCHEMA = [
        'type' => 'array',
        'items' => [
            'type' => 'object',
            'required' => ['url', 'type'],
            'properties' => [
                'type' => ['enum' => ['frame']],
                'url' => ['$ref' => '#/definitions/saneUrl'],
            ],
        ],
        'definitions' => [
            'saneUrl' => ['format' => 'uri', 'pattern' => '^https?://'],
        ],
        'additionalProperties' => false,
        'minItems' => 1,
    ];

    protected $fillable = ['title', 'content', 'user_id'];

    protected function casts(): array
    {
        return ['content' => 'array'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
