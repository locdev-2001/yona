<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một dòng cho mỗi
// (account, ngày, chiều, chỉ số).
class ReportingEventsRollup extends Model
{
    public const DIMENSION_ACCOUNT = 'account';

    public const DIMENSION_AGENT = 'agent';

    public const DIMENSION_INBOX = 'inbox';

    public const DIMENSION_TEAM = 'team';

    public const DIMENSION_TYPES = [
        self::DIMENSION_ACCOUNT,
        self::DIMENSION_AGENT,
        self::DIMENSION_INBOX,
        self::DIMENSION_TEAM,
    ];

    public const UNIQUE_KEY = ['account_id', 'date', 'dimension_type', 'dimension_id', 'metric'];

    protected $fillable = [
        'account_id',
        'date',
        'dimension_type',
        'dimension_id',
        'metric',
        'count',
        'sum_value',
        'sum_value_business_hours',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'count' => 'integer',
            'sum_value' => 'float',
            'sum_value_business_hours' => 'float',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
