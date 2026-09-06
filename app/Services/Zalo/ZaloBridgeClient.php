<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Cửa DUY NHẤT nói chuyện với bridge Node (services/zalo-bridge). Port từ các
 * lời gọi Http rải trong ZaloConnectionController + ZaloSendService của nhánh
 * `main` — gom về một lớp để đổi giao thức bridge chỉ sửa ở đây.
 *
 * Trả về `null` khi không nối được bridge; caller quyết định thông điệp cho người dùng.
 */
class ZaloBridgeClient
{
    public function startQrLogin(Zalo $channel, string $qrToken): ?Response
    {
        return $this->post('/auth/qr/start', [
            'qr_token' => $qrToken,
            'bot_id' => $channel->connectionId(),
        ], $this->uiSecretHeader());
    }

    public function qrStatus(string $qrToken): ?Response
    {
        return $this->get('/auth/qr/status', ['qr_token' => $qrToken], $this->uiSecretHeader());
    }

    public function promote(Zalo $channel, string $qrToken): ?Response
    {
        return $this->post('/auth/qr/promote', [
            'qr_token' => $qrToken,
            'connection_id' => $channel->connectionId(),
            'workspace_id' => (string) $channel->account_id,
        ], $this->uiSecretHeader());
    }

    public function cancelQrLogin(string $qrToken): ?Response
    {
        return $this->post('/auth/qr/cancel', ['qr_token' => $qrToken], $this->uiSecretHeader());
    }

    public function logout(Zalo $channel): ?Response
    {
        return $this->post('/auth/logout', ['connection_id' => $channel->connectionId()], $this->uiSecretHeader());
    }

    /** @param array<string, mixed> $payload */
    public function sendMessage(array $payload, bool $hasMedia = false): ?Response
    {
        return $this->post(
            '/personal-messages/send',
            $payload,
            ['X-Bridge-Send-Secret' => (string) config('zalo.bridge.send_secret')],
            $hasMedia ? (int) config('zalo.bridge.media_timeout') : (int) config('zalo.bridge.timeout'),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers
     */
    private function post(string $path, array $payload, array $headers, ?int $timeout = null): ?Response
    {
        try {
            return Http::asJson()
                ->withHeaders($headers)
                ->timeout($timeout ?? (int) config('zalo.bridge.timeout'))
                ->post($this->url($path), $payload);
        } catch (ConnectionException) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $query
     * @param  array<string, string>  $headers
     */
    private function get(string $path, array $query, array $headers): ?Response
    {
        try {
            return Http::asJson()
                ->withHeaders($headers)
                ->timeout((int) config('zalo.bridge.timeout'))
                ->get($this->url($path), $query);
        } catch (ConnectionException) {
            return null;
        }
    }

    /** @return array<string, string> */
    private function uiSecretHeader(): array
    {
        return ['X-Bridge-UI-Secret' => (string) config('zalo.bridge.ui_secret')];
    }

    private function url(string $path): string
    {
        return rtrim((string) config('zalo.bridge.url'), '/').$path;
    }
}
