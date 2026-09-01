<?php

namespace App\Models;

use Database\Factories\AccessTokenFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/access_token.rb — token của Application API
// (header api_access_token), owner polymorphic (User; AgentBot vào ở D4).
class AccessToken extends Model
{
    /** @use HasFactory<AccessTokenFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_type',
        'owner_id',
        'token',
    ];

    protected static function booted(): void
    {
        // has_secure_token :token — 24 ký tự base58.
        static::creating(function (AccessToken $accessToken) {
            $accessToken->token ??= Str::random(24);
        });
    }

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }
}
