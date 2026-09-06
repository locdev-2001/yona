<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use App\Models\Message;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Zalo\Exception\RateCapException;
use App\Services\Zalo\Exception\SendOutsideWindowException;
use App\Services\Zalo\Exception\ZaloCircuitOpenException;
use App\Services\Zalo\Exception\ZaloNotConnectedException;

/**
 * Gửi tin ra Zalo cá nhân qua bridge. Port từ ZaloSendService của nhánh `main`,
 * đặt lại trên khung BaseSendOnChannelService để SendReplyJob gọi như mọi kênh khác.
 *
 * Thứ tự kiểm tra: ngắt mạch → phiên còn sống → hạn mức (chỉ tin chủ động) → gửi.
 * Lỗi ghi vào `content_attributes.external_error` qua ChannelMessageStatus, không
 * ném ra ngoài — job gửi tin không được làm hỏng luồng tạo tin.
 */
class SendOnZaloService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Zalo::class;
    }

    protected function performReply(): void
    {
        /** @var Zalo $channel */
        $channel = $this->channel();
        $monitor = app(ZaloHealthMonitor::class);
        $limiter = app(SendRateLimiter::class);

        try {
            $this->assertSendable($channel, $monitor, $limiter);
            $sourceId = $this->callBridge($channel, $monitor);
        } catch (ZaloCircuitOpenException|ZaloNotConnectedException|RateCapException|SendOutsideWindowException $exception) {
            ChannelMessageStatus::fail($this->message, $exception->getMessage());

            return;
        }

        if (filled($sourceId)) {
            $this->message->update(['source_id' => $sourceId]);
        }

        if (! $this->isReplyInConversationWindow()) {
            $limiter->increment($channel->account_id, $this->rateLimitTarget());
        }

        $monitor->reset($channel->connectionId());
    }

    private function assertSendable(Zalo $channel, ZaloHealthMonitor $monitor, SendRateLimiter $limiter): void
    {
        if ($monitor->isCircuitOpen($channel->connectionId())) {
            throw new ZaloCircuitOpenException('Kết nối Zalo đang lỗi liên tục, tạm dừng gửi.');
        }

        if (! $channel->isConnected()) {
            throw new ZaloNotConnectedException('Tài khoản Zalo cần quét lại mã QR.');
        }

        $limiter->assertCanSend(
            $channel->account_id,
            $this->rateLimitTarget(),
            $this->isReplyInConversationWindow(),
        );
    }

    private function callBridge(Zalo $channel, ZaloHealthMonitor $monitor): ?string
    {
        $attachment = $this->message->attachments()->first();

        $payload = array_filter([
            'connection_id' => $channel->connectionId(),
            'thread_id' => $channel->threadId($this->message),
            'thread_type' => $channel->threadType($this->message),
            'text' => $this->message->content,
            'file_url' => $attachment?->downloadUrl(),
            'media_kind' => $attachment?->fileTypeName(),
            'quote' => $this->message->content_attributes['quote'] ?? null,
            'sticker' => $this->message->content_attributes['sticker'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        $response = app(ZaloBridgeClient::class)->sendMessage($payload, $attachment !== null);

        if ($response === null) {
            throw new ZaloNotConnectedException('Không kết nối được dịch vụ Zalo (bridge).');
        }

        $status = $response->status();
        $body = $response->json() ?? [];

        if ($status === 503 || ($body['message'] ?? '') === 'not_logged_in') {
            $monitor->recordError($channel->connectionId(), 'session_lost');
            $channel->markState(Zalo::STATE_SESSION_LOST, 'not_logged_in');
            throw new ZaloNotConnectedException('Phiên Zalo đã hết, vui lòng quét lại mã QR.');
        }

        if ($status === 429 || $status === 403) {
            $monitor->recordError($channel->connectionId(), (string) $status);
            throw new ZaloNotConnectedException("Zalo từ chối yêu cầu ({$status}).");
        }

        if (! $response->successful()) {
            throw new ZaloNotConnectedException("Bridge lỗi HTTP {$status}: ".($body['message'] ?? 'unknown'));
        }

        return isset($body['source_id']) ? (string) $body['source_id'] : null;
    }

    /** Số điện thoại là khóa đếm hạn mức; chưa biết số thì dùng định danh luồng. */
    private function rateLimitTarget(): string
    {
        $phone = $this->contact()->phone_number;

        return blank($phone) ? (string) $this->sourceId() : (string) $phone;
    }

    /**
     * Tin TRẢ LỜI = khách có tin đến trong cửa sổ hội thoại → không phải tin chủ
     * động nên miễn khung giờ lẫn trần ngày (quyết định đã chốt trong CLAUDE.md).
     */
    private function isReplyInConversationWindow(): bool
    {
        return Message::query()
            ->where('conversation_id', $this->message->conversation_id)
            ->where('message_type', Message::TYPE_INCOMING)
            ->where('created_at', '>=', now()->subHours((int) config('zalo.reply_window_hours')))
            ->exists();
    }
}
