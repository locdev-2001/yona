<?php

namespace App\Services\MessengerPersonal;

use App\Models\Channel\MessengerPersonal;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cửa DUY NHẤT nói chuyện với sidecar Messenger cá nhân, đúng hợp đồng
 * plans/261029-personal-messenger-channel/contract.md. Trả `null` khi không nối được
 * sidecar; bên gọi quyết định câu cho người dùng.
 *
 * Thân request đăng nhập chứa mật khẩu: không bao giờ đưa payload vào log.
 */
class BridgeClient
{
    private const UI_SECRET_HEADER = 'X-Bridge-UI-Secret';

    private const SEND_SECRET_HEADER = 'X-Bridge-Send-Secret';

    private const LOGIN_PLATFORM = 'ios';

    /** Máy chủ chưa đặt secret của sidecar = kênh chưa triển khai ở đây (giám sát bỏ qua). */
    public function isConfigured(): bool
    {
        return filled(config('messenger_personal.bridge.ui_secret')) && filled(config('messenger_personal.bridge.send_secret'));
    }

    public function ping(): ?Response
    {
        return $this->request('GET', '/', [], []);
    }

    public function startLogin(MessengerPersonal $channel, string $loginToken): ?Response
    {
        return $this->request('POST', '/auth/login/start', [
            'login_token' => $loginToken,
            'connection_id' => $channel->connectionId(),
            'platform' => self::LOGIN_PLATFORM,
        ], $this->uiSecretHeader());
    }

    /** @param array<string, string> $input giá trị các ô của bước hiện tại (có thể chứa mật khẩu) */
    public function submitLogin(string $loginToken, array $input): ?Response
    {
        return $this->request('POST', '/auth/login/submit', [
            'login_token' => $loginToken,
            'input' => (object) $input,
        ], $this->uiSecretHeader(), (int) config('messenger_personal.bridge.login_timeout'));
    }

    public function cancelLogin(string $loginToken): ?Response
    {
        return $this->request('POST', '/auth/login/cancel', ['login_token' => $loginToken], $this->uiSecretHeader());
    }

    public function logout(MessengerPersonal $channel): ?Response
    {
        return $this->request('POST', '/auth/logout', ['connection_id' => $channel->connectionId()], $this->uiSecretHeader());
    }

    public function health(MessengerPersonal $channel): ?Response
    {
        return $this->request('GET', '/health', ['connection_id' => $channel->connectionId()], $this->uiSecretHeader());
    }

    /** Thành viên của một chat (nhóm: mọi người trừ chính chủ; 1-1: người kia) để nhắc tên. */
    public function chatMembers(MessengerPersonal $channel, MessengerChat $chat): ?Response
    {
        return $this->request('GET', '/chats/members', [
            'connection_id' => $channel->connectionId(),
            'chat_kind' => $chat->kind,
            'chat_id' => $chat->id,
        ], $this->uiSecretHeader());
    }

    /** @param array<string, mixed> $payload */
    public function send(array $payload): ?Response
    {
        $timeout = isset($payload['media'])
            ? (int) config('messenger_personal.bridge.media_timeout')
            : (int) config('messenger_personal.bridge.send_timeout');

        return $this->request('POST', '/messages/send', $payload, $this->sendSecretHeader(), $timeout);
    }

    /** @param array<string, mixed> $payload */
    public function reaction(array $payload): ?Response
    {
        return $this->request('POST', '/messages/reaction', $payload, $this->sendSecretHeader());
    }

    /** @param array<string, mixed> $payload */
    public function unsend(array $payload): ?Response
    {
        return $this->request('POST', '/messages/unsend', $payload, $this->sendSecretHeader());
    }

    /** @param array<string, mixed> $payload */
    public function typing(array $payload): ?Response
    {
        return $this->request('POST', '/messages/typing', $payload, $this->sendSecretHeader(), (int) config('messenger_personal.bridge.typing_timeout'));
    }

    /** @param array<string, mixed> $payload */
    public function markRead(array $payload): ?Response
    {
        return $this->request('POST', '/messages/read', $payload, $this->sendSecretHeader());
    }

    /** @param array<string, mixed> $payload */
    public function acceptRequest(array $payload): ?Response
    {
        return $this->request('POST', '/requests/accept', $payload, $this->sendSecretHeader());
    }

    /**
     * Tệp của kênh mã hoá nằm trên chính sidecar (`/media/{token}`). Chỉ URL cùng gốc với
     * MESSENGER_BRIDGE_URL mới được coi là của sidecar và mang UI secret — URL khác trong
     * payload mà mang secret là rò khoá ra ngoài.
     */
    public function ownsUrl(string $url): bool
    {
        return $this->origin($url) !== null && $this->origin($url) === $this->origin($this->baseUrl());
    }

    /** @return array<string, string> */
    public function mediaHeaders(): array
    {
        return $this->uiSecretHeader();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers
     */
    private function request(string $method, string $path, array $payload, array $headers, ?int $timeout = null): ?Response
    {
        $client = Http::acceptJson()
            ->withHeaders($headers)
            ->timeout($timeout ?? (int) config('messenger_personal.bridge.timeout'));

        try {
            return $method === 'GET'
                ? $client->get($this->url($path), $payload)
                : $client->asJson()->post($this->url($path), $payload);
        } catch (ConnectionException $exception) {
            Log::warning('messenger_personal.bridge.unreachable', [
                'method' => $method,
                'path' => $path,
                'reason' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /** @return array<string, string> */
    private function uiSecretHeader(): array
    {
        return [self::UI_SECRET_HEADER => (string) config('messenger_personal.bridge.ui_secret')];
    }

    /** @return array<string, string> */
    private function sendSecretHeader(): array
    {
        return [self::SEND_SECRET_HEADER => (string) config('messenger_personal.bridge.send_secret')];
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('messenger_personal.bridge.url'), '/');
    }

    private function url(string $path): string
    {
        return $this->baseUrl().$path;
    }

    private function origin(string $url): ?string
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));

        if ($scheme === '' || $host === '') {
            return null;
        }

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);

        return "{$scheme}://{$host}:{$port}";
    }
}
