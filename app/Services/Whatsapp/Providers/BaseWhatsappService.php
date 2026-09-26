<?php

namespace App\Services\Whatsapp\Providers;

use App\Channels\CapabilitySet;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Channel\Whatsapp;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Log;

abstract class BaseWhatsappService implements WhatsappProvider
{
    public function __construct(protected readonly Whatsapp $channel) {}

    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::none();
    }

    /**
     * Chữ thật sự gửi đi: tin có lựa chọn (quick reply, thẻ, chọn giờ…) hạ xuống
     * chữ kèm danh sách đánh số qua DeliveryPlanner — WhatsApp chưa có renderer
     * gốc (docs/system-architecture.md §3). Tin chữ thuần giữ nguyên như cũ.
     * Dùng chung cho mọi nhà cung cấp để không lặp lại ở từng lớp con.
     */
    protected function outgoingText(Message $message): string
    {
        return app(DeliveryPlanner::class)->plan($message, $this->channel->capabilities())->plainText()
            ?? (string) $message->outgoingContent();
    }

    // Whatsapp::Providers::BaseService#process_response — API trả 200 kèm khối error.
    protected function processResponse(Response $response, Message $message): ?string
    {
        if ($response->successful() && blank($response->json('error'))) {
            return $response->json('messages.0.id');
        }

        Log::error('[WHATSAPP] '.$response->body());

        $errorMessage = $this->errorMessage($response);

        if (filled($errorMessage)) {
            ChannelMessageStatus::fail($message, $errorMessage);
        }

        return null;
    }

    protected function errorMessage(Response $response): ?string
    {
        return $response->json('error.message');
    }
}
