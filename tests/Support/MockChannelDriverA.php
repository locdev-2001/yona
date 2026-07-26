<?php

namespace Tests\Support;

use App\Contracts\SendException;
use App\Enums\TenantPermission;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\ChannelCapabilities;
use App\Modules\Chat\Port\ChannelDescriptor;

/**
 * P11 — Mock kênh A: policy TRÁI NGƯỢC Zalo — không receipts, không media,
 * không sticker, không quote/react, không typing. Ép core/UI KHÔNG assume Zalo.
 * Sống trong tests/Support — đăng ký kênh mới KHÔNG sửa file production nào.
 */
class MockChannelDriverA extends AbstractChannelDriver
{
    /** @var list<array<string, mixed>> */
    public array $sentPayloads = [];

    public function descriptor(): ChannelDescriptor
    {
        return new ChannelDescriptor(
            key: 'mock_a',
            label: 'Kênh giả A',
            category: 'chat',
            logo: '',
            badge: 'A',
            connectRouteName: null,
            managePermission: TenantPermission::ChannelManage,
        );
    }

    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities; // all-false, receiptGranularity none
    }

    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        // POLICY driver-owned: kênh này không hỗ trợ media/sticker
        if (($payload['media'] ?? null) !== null || ($payload['sticker'] ?? null) !== null) {
            throw new SendException('Kênh này không hỗ trợ media/sticker.', 'unsupported');
        }

        $this->sentPayloads[] = $payload;

        // TRANSPORT + persist (contract: driver trả đúng Message vừa ghi + bump stream_version)
        $message = Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => 'text',
            'body' => $payload['text'] ?? null,
            'source_id' => 'mock_a_'.uniqid(),
            'platform_sent_at' => now(),
        ]);
        Conversation::where('id', $conversation->id)->increment('stream_version');

        return $message;
    }

    public function parseInbound(array $raw): array
    {
        return [
            'channel' => 'mock_a',
            'channel_account_id' => $raw['channel_account_id'] ?? null,
            'thread_uid' => (string) ($raw['thread_uid'] ?? $raw['sender_uid'] ?? ''),
            'peer_name' => $raw['peer_name'] ?? null,
            'peer_avatar' => null,
            'peer_phone' => null,
            'thread_kind' => ($raw['thread_kind'] ?? null) ?: (((int) ($raw['thread_type'] ?? 0)) === 1 ? 'group' : 'direct'),
            'direction' => $raw['direction'] ?? 'in',
            'source_id' => $raw['source_id'] ?? null,
            'type' => 'text',
            'body' => $raw['body'] ?? null,
            'media_url' => null,
            'media_meta' => [],
            'platform_sent_at' => $raw['platform_sent_at'] ?? null,
            'sender_uid' => null,
            'sender_name' => null,
            'sent_by' => null,
            'platform_meta' => $raw['platform_meta'] ?? [],
        ];
    }
}
