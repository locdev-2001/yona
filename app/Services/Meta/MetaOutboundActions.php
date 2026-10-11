<?php

namespace App\Services\Meta;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelOutboundActions;
use Illuminate\Http\Client\Response;

/**
 * Hành động trên tin đã có ở Messenger Platform (Messenger và Instagram dùng chung Send
 * API): thả/đổi/gỡ cảm xúc qua `sender_action: react|unreact` (Meta mở 12/2025). Meta
 * nhận emoji unicode bất kỳ nên không cần bảng mã; đổi cảm xúc = gửi `react` lần nữa.
 * Thu hồi và báo đang gõ chưa khai nên không tới đây.
 */
abstract class MetaOutboundActions implements ChannelOutboundActions
{
    public const ERROR_MISSING_SOURCE_ID = 'missing_source_id';

    /** Hành động trên tin không gắn được thẻ HUMAN_AGENT nên chỉ hợp lệ trong 24 giờ kể từ tin cuối của khách. */
    public const ERROR_OUTSIDE_MESSAGING_WINDOW = 'outside_messaging_window';

    private const META_ERROR_OUTSIDE_WINDOW = 10;

    public function reaction(Message $message, ?string $emoji): array
    {
        if (blank($message->source_id)) {
            return $this->failure(self::ERROR_MISSING_SOURCE_ID, $message);
        }

        $payload = ['message_id' => $message->source_id];

        if ($emoji !== null) {
            $payload['reaction'] = $emoji;
        }

        $response = $this->send($message->conversation, [
            'recipient' => ['id' => $message->conversation->contactInbox->source_id],
            'sender_action' => $emoji === null ? 'unreact' : 'react',
            'payload' => $payload,
        ]);

        if (filled($response->json('error'))) {
            return (int) $response->json('error.code') === self::META_ERROR_OUTSIDE_WINDOW
                ? $this->failure(self::ERROR_OUTSIDE_MESSAGING_WINDOW, $message)
                : [
                    'ok' => false,
                    'code' => (string) $response->json('error.code'),
                    'message' => (string) $response->json('error.message'),
                ];
        }

        return ['ok' => true];
    }

    public function recall(Message $message): array
    {
        throw new \LogicException('Messenger Platform không có thu hồi tin của trang.');
    }

    public function typing(Conversation $conversation): void {}

    /** @param array<string, mixed> $payload */
    abstract protected function send(Conversation $conversation, array $payload): Response;

    /** @return array{ok: false, code: string, message: string} */
    private function failure(string $code, Message $message): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'message' => __("errors.meta.action.{$code}", [], $message->inbox->account->locale),
        ];
    }
}
