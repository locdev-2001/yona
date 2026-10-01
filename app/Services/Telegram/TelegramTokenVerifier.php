<?php

namespace App\Services\Telegram;

use App\Models\Channel\Telegram;
use App\Services\Channels\VerifiesChannelCredentials;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Validation\ValidationException;

/** Token BotFather phải gọi được getMe thì mới lưu; tên bot lấy luôn từ đó. */
class TelegramTokenVerifier implements VerifiesChannelCredentials
{
    public function verify(Model $channel): void
    {
        /** @var Telegram $channel */
        if (! $channel->isDirty('bot_token')) {
            return;
        }

        try {
            $profile = (new TelegramClient($channel))->getMe();
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['channel.bot_token' => __('inbox_mgmt.CONNECTION_CHECK.TELEGRAM_UNREACHABLE')]);
        }

        $username = $profile->json('result.username');

        if (! $profile->successful() || blank($username)) {
            throw ValidationException::withMessages(['channel.bot_token' => __('inbox_mgmt.CONNECTION_CHECK.TELEGRAM_INVALID_TOKEN')]);
        }

        $channel->bot_name = (string) $username;
    }
}
