<?php

namespace App\Services\Integrations\Slack;

use Illuminate\Support\Facades\Http;

// Port từ `Slack::Web::Client` (gem slack-ruby-client) — cổng DUY NHẤT gọi ra
// Slack Web API bằng Illuminate\Http\Client. Mọi service Slack đi qua đây
// (DRY): build request, đọc `ok`/`error`, ký lỗi thành SlackApiException để
// caller rescue đúng như bản gốc rescue theo lớp lỗi.
class SlackClient
{
    private const BASE_URL = 'https://slack.com/api/';

    public function __construct(private readonly ?string $token = null) {}

    public function oauthV2Access(string $clientId, string $clientSecret, string $code, string $redirectUri): array
    {
        return $this->call('oauth.v2.access', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'redirect_uri' => $redirectUri,
        ], withToken: false);
    }

    public function conversationsList(array $params): array
    {
        return $this->call('conversations.list', $params);
    }

    public function conversationsJoin(string $channel): array
    {
        return $this->call('conversations.join', ['channel' => $channel]);
    }

    public function conversationsMembers(string $channel): array
    {
        return $this->call('conversations.members', ['channel' => $channel]);
    }

    public function usersInfo(string $userId): array
    {
        return $this->call('users.info', ['user' => $userId]);
    }

    public function chatPostMessage(array $payload): array
    {
        return $this->call('chat.postMessage', $payload);
    }

    public function chatUpdate(array $payload): array
    {
        return $this->call('chat.update', $payload);
    }

    public function chatUnfurl(array $payload): array
    {
        return $this->call('chat.unfurl', $payload);
    }

    /**
     * Port `files_upload_v2` (slack-ruby-client) — luồng tải tệp mới của Slack:
     * xin URL tải lên riêng cho từng tệp, đẩy nội dung nhị phân lên đó, rồi báo
     * hoàn tất để gắn các tệp vào kênh/luồng cùng lúc.
     *
     * @param  list<array{filename: string, content: string, title?: string}>  $files
     */
    public function filesUploadV2(array $files, ?string $channelId, ?string $threadTs, ?string $initialComment): array
    {
        $uploaded = [];

        foreach ($files as $file) {
            $uploadUrlResponse = $this->call('files.getUploadURLExternal', [
                'filename' => $file['filename'],
                'length' => strlen($file['content']),
            ]);

            Http::withToken($this->token)
                ->attach('file', $file['content'], $file['filename'])
                ->post($uploadUrlResponse['upload_url']);

            $uploaded[] = ['id' => $uploadUrlResponse['file_id'], 'title' => $file['title'] ?? $file['filename']];
        }

        return $this->call('files.completeUploadExternal', array_filter([
            'files' => json_encode($uploaded),
            'channel_id' => $channelId,
            'thread_ts' => $threadTs,
            'initial_comment' => $initialComment,
        ], fn (mixed $value) => $value !== null));
    }

    /** @return array<string, mixed> */
    private function call(string $method, array $payload, bool $withToken = true): array
    {
        $request = Http::asForm();
        $request = $withToken ? $request->withToken($this->token) : $request;
        $response = $request->post(self::BASE_URL.$method, $payload);
        $data = $response->json() ?? [];

        if (($data['ok'] ?? false) !== true) {
            throw SlackApiException::fromResponse($method, $data);
        }

        return $data;
    }
}
