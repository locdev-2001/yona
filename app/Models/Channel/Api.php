<?php

namespace App\Models\Channel;

use App\Models\Account;
use App\Models\Inbox;
use Database\Factories\Channel\ApiFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/channel/api.rb (+ Channelable, WebhookSecretable).
// has_secure_token của Rails sinh chuỗi base58 24 ký tự cho identifier/hmac_token/secret.
class Api extends Model
{
    /** @use HasFactory<ApiFactory> */
    use HasFactory;

    protected $table = 'channel_api';

    /** @var list<string> Kênh chỉ cho sửa các thuộc tính này qua inbox update (EDITABLE_ATTRS). */
    public const EDITABLE_ATTRS = ['webhook_url', 'hmac_mandatory', 'additional_attributes'];

    protected $fillable = [
        'account_id',
        'webhook_url',
        'hmac_mandatory',
        'additional_attributes',
    ];

    protected function casts(): array
    {
        return [
            'hmac_mandatory' => 'boolean',
            'additional_attributes' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Api $channel) {
            $channel->identifier ??= self::generateToken();
            $channel->hmac_token ??= self::generateToken();
            $channel->secret ??= self::generateToken();
        });
    }

    public static function generateToken(): string
    {
        return Str::random(24);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): MorphOne
    {
        return $this->morphOne(Inbox::class, 'channel');
    }

    public function name(): string
    {
        return 'API';
    }

    // WebhookSecretable#reset_secret!
    public function resetSecret(): void
    {
        $this->forceFill(['secret' => self::generateToken()])->save();
    }
}
