<?php

namespace App\Services\Email\OAuth;

use App\Models\Channel\Email;

/** Sổ đăng ký nhà cung cấp hộp thư OAuth — thêm nhà cung cấp = thêm một dòng. */
final class EmailOAuthProviders
{
    /** @var list<class-string<EmailOAuthProvider>> */
    private const PROVIDERS = [
        GoogleMailOAuthProvider::class,
        MicrosoftMailOAuthProvider::class,
    ];

    public static function find(string $key): ?EmailOAuthProvider
    {
        foreach (self::PROVIDERS as $class) {
            $provider = app($class);

            if ($provider->key() === $key) {
                return $provider;
            }
        }

        return null;
    }

    public static function forChannel(Email $channel): ?EmailOAuthProvider
    {
        return filled($channel->provider) ? self::find((string) $channel->provider) : null;
    }
}
