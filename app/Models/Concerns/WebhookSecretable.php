<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

// has_secure_token :secret (base58 24 ký tự) + reset_secret!. Dùng chung cho Webhook, AgentBot
// và mọi kênh có secret; thêm nơi cần secret = dùng trait, không chép lại.
trait WebhookSecretable
{
    public static function bootWebhookSecretable(): void
    {
        static::creating(function (self $model) {
            $model->secret ??= self::generateSecret();
        });
    }

    public static function generateSecret(): string
    {
        return Str::random(24);
    }

    public function resetSecret(): void
    {
        $this->forceFill(['secret' => self::generateSecret()])->save();
    }
}
