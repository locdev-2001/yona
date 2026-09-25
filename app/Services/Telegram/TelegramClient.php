<?php

namespace App\Services\Telegram;

use App\Models\Channel\Telegram;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Cửa duy nhất nói chuyện với Telegram Bot API (thay HTTParty rải trong model gốc).
 */
class TelegramClient
{
    public function __construct(private readonly Telegram $channel) {}

    public function getMe(): Response
    {
        return Http::get($this->channel->apiUrl().'/getMe');
    }

    public function setWebhook(string $url): Response
    {
        Http::post($this->channel->apiUrl().'/deleteWebhook');

        return Http::asForm()->post($this->channel->apiUrl().'/setWebhook', ['url' => $url]);
    }

    /** @param array<string, mixed> $body */
    public function sendMessage(array $body): Response
    {
        return Http::asForm()->post($this->channel->apiUrl().'/sendMessage', $body);
    }

    /** @param array<string, mixed> $body */
    public function sendMediaGroup(array $body): Response
    {
        return Http::asForm()->post($this->channel->apiUrl().'/sendMediaGroup', $body);
    }

    /** @param array<string, mixed> $body */
    public function sendDocument(array $body): Response
    {
        return Http::asForm()->post($this->channel->apiUrl().'/sendDocument', $body);
    }

    // Tắt vòng xoay chờ trên nút khách vừa bấm; không chặn luồng nếu Telegram lỗi.
    public function answerCallbackQuery(string $callbackQueryId): Response
    {
        return Http::asForm()->post($this->channel->apiUrl().'/answerCallbackQuery', ['callback_query_id' => $callbackQueryId]);
    }

    public function profileImageUrl(string|int $userId): ?string
    {
        $response = Http::get($this->channel->apiUrl().'/getUserProfilePhotos', ['user_id' => $userId]);

        if (! $response->successful()) {
            return null;
        }

        $photos = $response->json('result.photos');

        if (blank($photos)) {
            return null;
        }

        $largest = end($photos[0]);

        return $this->filePath($largest['file_id']);
    }

    public function filePath(string $fileId): ?string
    {
        $response = Http::get($this->channel->apiUrl().'/getFile', ['file_id' => $fileId]);

        if (! $response->successful()) {
            return null;
        }

        return $this->channel->fileUrl((string) $response->json('result.file_path'));
    }
}
