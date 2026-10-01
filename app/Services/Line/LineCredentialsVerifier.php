<?php

namespace App\Services\Line;

use App\Models\Channel\Line;
use App\Services\Channels\VerifiesChannelCredentials;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Validation\ValidationException;

/**
 * Kiểm channel access token với LINE khi lưu; ID kênh lấy từ chính LINE (`client_id`)
 * nên khách không phải chép thêm ô đó. Channel secret không có API để kiểm — sai
 * thì webhook bị từ chối chữ ký, hướng dẫn trên form nhắc chép đúng ô.
 */
class LineCredentialsVerifier implements VerifiesChannelCredentials
{
    public function verify(Model $channel): void
    {
        /** @var Line $channel */
        if (! $channel->isDirty('line_channel_token')) {
            return;
        }

        try {
            $response = (new LineClient($channel))->verifyAccessToken();
        } catch (ConnectionException) {
            throw ValidationException::withMessages(['channel.line_channel_token' => __('inbox_mgmt.CONNECTION_CHECK.LINE_UNREACHABLE')]);
        }

        $channelId = $response->json('client_id');

        if (! $response->successful() || blank($channelId)) {
            throw ValidationException::withMessages(['channel.line_channel_token' => __('inbox_mgmt.CONNECTION_CHECK.LINE_INVALID_TOKEN')]);
        }

        if (filled($channel->line_channel_id) && (string) $channel->line_channel_id !== (string) $channelId) {
            throw ValidationException::withMessages(['channel.line_channel_id' => __('inbox_mgmt.CONNECTION_CHECK.LINE_CHANNEL_MISMATCH')]);
        }

        $channel->line_channel_id = (string) $channelId;
    }
}
