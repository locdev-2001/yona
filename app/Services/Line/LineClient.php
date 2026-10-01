<?php

namespace App\Services\Line;

use App\Models\Channel\Line;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// Thay gem line-bot-sdk: Messaging API qua Http facade.
class LineClient
{
    private const API_BASE = 'https://api.line.me/v2/bot';

    private const DATA_API_BASE = 'https://api-data.line.me/v2/bot';

    public function __construct(private readonly Line $channel) {}

    public function profile(string $userId): Response
    {
        return $this->request()->get(self::API_BASE."/profile/{$userId}");
    }

    public function messageContentUrl(string $messageId): string
    {
        return self::DATA_API_BASE."/message/{$messageId}/content";
    }

    /**
     * Header xác thực để đường tải đính kèm dùng chung gọi thẳng URL nội dung —
     * LINE không có URL công khai, mọi tệp đều phải kèm channel token.
     *
     * @return array<string, string>
     */
    public function authHeaders(): array
    {
        return ['Authorization' => 'Bearer '.$this->channel->line_channel_token];
    }

    /** @param array<int|string, mixed> $messages */
    public function pushMessage(string $to, array $messages): Response
    {
        return $this->request()->post(self::API_BASE.'/message/push', [
            'to' => $to,
            'messages' => array_is_list($messages) ? $messages : [$messages],
        ]);
    }

    /** POST /v2/oauth/verify: token còn hiệu lực thì trả `client_id` = ID kênh LINE. */
    public function verifyAccessToken(): Response
    {
        return Http::asForm()->timeout(30)->post('https://api.line.me/v2/oauth/verify', [
            'access_token' => $this->channel->line_channel_token,
        ]);
    }

    public function botInfo(): Response
    {
        return $this->request()->get(self::API_BASE.'/info');
    }

    private function request(): PendingRequest
    {
        return Http::withToken($this->channel->line_channel_token)->timeout(30);
    }
}
