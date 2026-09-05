<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\ApiFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/api.rb (+ Channelable, WebhookSecretable).
class Api extends Model
{
    /** @use HasFactory<ApiFactory> */
    use Channelable, HasFactory;

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

    public function name(): string
    {
        return 'API';
    }

    public static function channelRules(): array
    {
        return ['webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048']];
    }

    // WebhookSecretable#reset_secret!
    public function resetSecret(): void
    {
        $this->forceFill(['secret' => self::generateToken()])->save();
    }
}
