<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use App\Models\Channel\Concerns\Reauthorizable;
use Database\Factories\Channel\TiktokFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/tiktok.rb.
class Tiktok extends Model
{
    /** @use HasFactory<TiktokFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 1;

    protected $table = 'channel_tiktok';

    protected $fillable = [
        'account_id', 'business_id', 'access_token', 'expires_at',
        'refresh_token', 'refresh_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
            'refresh_token_expires_at' => 'datetime',
        ];
    }

    public function name(): string
    {
        return 'Tiktok';
    }

    public static function channelRules(): array
    {
        return [
            'business_id' => ['required', 'string', 'max:255'],
            'access_token' => ['required', 'string'],
            'refresh_token' => ['required', 'string'],
            'expires_at' => ['required', 'date'],
            'refresh_token_expires_at' => ['required', 'date'],
        ];
    }
}
