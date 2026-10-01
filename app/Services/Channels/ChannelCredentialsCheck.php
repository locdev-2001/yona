<?php

namespace App\Services\Channels;

use App\Models\Channel\Email;
use App\Models\Channel\Line;
use App\Models\Channel\Telegram;
use App\Services\Email\EmailConnectionVerifier;
use App\Services\Line\LineCredentialsVerifier;
use App\Services\Telegram\TelegramTokenVerifier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Một cửa cho mọi kênh: InboxesController gọi trước khi lưu kênh, bảng tra nằm ở đây
 * (cùng lối với ChannelSetupService). Thêm kênh có thông tin đăng nhập = thêm một dòng.
 */
class ChannelCredentialsCheck
{
    /** @var array<class-string<Model>, class-string<VerifiesChannelCredentials>> */
    private const VERIFIERS = [
        Email::class => EmailConnectionVerifier::class,
        Telegram::class => TelegramTokenVerifier::class,
        Line::class => LineCredentialsVerifier::class,
    ];

    /** @throws ValidationException */
    public function verify(?Model $channel): void
    {
        $verifier = $channel ? (self::VERIFIERS[$channel::class] ?? null) : null;

        if ($verifier !== null) {
            app($verifier)->verify($channel);
        }
    }
}
