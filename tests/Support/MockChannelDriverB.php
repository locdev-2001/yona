<?php

namespace Tests\Support;

use App\Contracts\SendException;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\ChannelCapabilities;

/**
 * P11 — Mock kênh B: policy TRÁI với A và Zalo — CÓ receipts (per_member) +
 * react, KHÔNG media, policy chặn tin >100 ký tự (chứng minh policy driver-owned,
 * không phải bộ 3 field {windowHours, dailyCap, allowedHours}).
 */
class MockChannelDriverB extends AbstractChannelDriver
{
    /** @var list<array<string, mixed>> */
    public array $sentPayloads = [];

    public function channelKey(): string
    {
        return 'mock_b';
    }

    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities(
            canSendMedia: false,
            canQuoteReply: true,
            canReact: true,
            hasDeliveryReceipts: true,
            hasSeenReceipts: true,
            hasTyping: true,
            receiptGranularity: 'per_member',
        );
    }

    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        if (($payload['media'] ?? null) !== null) {
            throw new SendException('Kênh này không hỗ trợ media.', 'unsupported');
        }

        // POLICY riêng của kênh B: tin dài quá 100 ký tự bị platform từ chối
        if (mb_strlen((string) ($payload['text'] ?? '')) > 100) {
            throw new SendException('Kênh này giới hạn 100 ký tự/tin.', 'policy_max_length');
        }

        $this->sentPayloads[] = $payload;

        $message = Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => 'text',
            'body' => $payload['text'] ?? null,
            'source_id' => 'mock_b_'.uniqid(),
            'platform_sent_at' => now(),
        ]);
        Conversation::where('id', $conversation->id)->increment('stream_version');

        return $message;
    }

    public function parseInbound(array $raw): array
    {
        return array_merge((new MockChannelDriverA)->parseInbound($raw), ['channel' => 'mock_b']);
    }
}
