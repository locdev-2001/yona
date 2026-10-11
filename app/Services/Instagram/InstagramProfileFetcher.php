<?php

namespace App\Services\Instagram;

use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Services\Meta\GraphApi;
use Illuminate\Support\Facades\Http;

/**
 * Lấy hồ sơ người dùng Instagram. Hai kênh dùng hai endpoint khác nhau —
 * khác biệt duy nhất giữa Instagram::MessageText và Instagram::Messenger::MessageText.
 */
class InstagramProfileFetcher
{
    private const FIELDS = 'name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user,is_verified_user';

    /** @param Instagram|FacebookPage $channel */
    public function __construct(private readonly object $channel) {}

    /** @return array<string, mixed> */
    public function fetch(string $userId): array
    {
        [$url, $token] = $this->channel instanceof Instagram
            ? [$this->channel->baseUri()."/{$userId}", $this->channel->access_token]
            : [GraphApi::baseUri()."/{$userId}", $this->channel->page_access_token];

        $response = Http::get($url, ['fields' => self::FIELDS, 'access_token' => $token]);

        if ($response->successful()) {
            return (array) $response->json();
        }

        // 190 = token hết hạn; 230/9010/100 = không có quyền xem hồ sơ, bỏ qua êm.
        if ((int) $response->json('error.code') === 190) {
            $this->channel->authorizationError();
        }

        return [];
    }
}
