<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelOutboundActions;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Hành động trên tin đã có ở Zalo: thả/gỡ biểu cảm (Q5), thu hồi (Q4), báo đang gõ.
 * Lõi gọi qua ChannelOutboundActions và chỉ biết `{ok, code, message}`; mọi đặc thù
 * (mã cảm xúc của Zalo, cliMsgId, một tin lõi mang nhiều msgId, `thread_type` chọn
 * endpoint 1-1 hay nhóm) nằm ở đây.
 */
class ZaloOutboundActions implements ChannelOutboundActions
{
    public const ERROR_MISSING_SOURCE_ID = 'missing_source_id';

    public const ERROR_EMOJI_NOT_SUPPORTED = 'emoji_not_supported';

    public const ERROR_BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const ERROR_SECRET_MISMATCH = 'secret_mismatch';

    public const ERROR_UNKNOWN = 'unknown';

    /** Mã bridge trả về nguyên văn được giữ nguyên; chỉ mã lạ mới quy về `unknown`. */
    private const BRIDGE_CODES = ['session_lost', 'zalo_rejected', 'bad_request', 'unknown'];

    /** Zalo hiện "đang soạn tin" vài giây rồi tự tắt — bắn dày hơn mức này là phí. */
    private const TYPING_THROTTLE_SECONDS = 5;

    public function reaction(Message $message, ?string $emoji): array
    {
        $sourceId = $this->firstSourceId($message);

        if ($sourceId === null) {
            return $this->failure(self::ERROR_MISSING_SOURCE_ID, $message);
        }

        $icon = $emoji === null ? '' : ReactionIcons::code($emoji);

        if ($icon === null) {
            return $this->failure(self::ERROR_EMOJI_NOT_SUPPORTED, $message);
        }

        $channel = $this->channel($message->conversation);

        return $this->outcome($message, app(ZaloBridgeClient::class)->sendReaction([
            'connection_id' => $channel->connectionId(),
            'thread_id' => $channel->threadIdOf($message->conversation),
            'thread_type' => $channel->threadTypeOf($message->conversation),
            'msg_id' => $sourceId,
            'cli_msg_id' => $this->clientMessageId($message),
            'icon' => $icon,
        ]));
    }

    /**
     * Một tin của lõi có thể đã thành NHIỀU tin trên Zalo (ảnh + chú thích, nhiều
     * tệp) — thu hồi phải quét hết `content_attributes.external_source_ids`, hỏng
     * một phần là hỏng cả thao tác (tin vẫn còn ở máy khách).
     */
    public function recall(Message $message): array
    {
        $sourceIds = $this->allSourceIds($message);

        if ($sourceIds === []) {
            return $this->failure(self::ERROR_MISSING_SOURCE_ID, $message);
        }

        $channel = $this->channel($message->conversation);
        $client = app(ZaloBridgeClient::class);

        foreach ($sourceIds as $sourceId) {
            $outcome = $this->outcome($message, $client->undoMessage([
                'connection_id' => $channel->connectionId(),
                'thread_id' => $channel->threadIdOf($message->conversation),
                'thread_type' => $channel->threadTypeOf($message->conversation),
                'msg_id' => $sourceId,
                'cli_msg_id' => $this->clientMessageId($message),
            ]));

            if (! $outcome['ok']) {
                return $outcome;
            }
        }

        return ['ok' => true];
    }

    public function typing(Conversation $conversation): void
    {
        $channel = $this->channel($conversation);

        if (! $channel->isConnected()) {
            return;
        }

        // Cache::add = khoá đặt được đúng một lần trong cửa sổ: mỗi phím gõ không
        // thành một lượt gọi bridge.
        if (! Cache::add("zalo:typing-out:{$conversation->id}", true, self::TYPING_THROTTLE_SECONDS)) {
            return;
        }

        app(ZaloBridgeClient::class)->sendTyping([
            'connection_id' => $channel->connectionId(),
            'thread_id' => $channel->threadIdOf($conversation),
            'thread_type' => $channel->threadTypeOf($conversation),
        ]);
    }

    /** @return array{ok: bool, code?: string, message?: string} */
    private function outcome(Message $message, ?Response $response): array
    {
        if ($response === null) {
            return $this->failure(self::ERROR_BRIDGE_UNREACHABLE, $message);
        }

        $body = is_array($response->json()) ? $response->json() : [];

        if ($response->successful() && ($body['ok'] ?? false) === true) {
            return ['ok' => true];
        }

        $detail = (string) ($body['message'] ?? $body['error'] ?? 'HTTP '.$response->status());

        return $this->failure($this->classify($response->status(), $body), $message, $detail);
    }

    /**
     * 503/403 của bridge là kiểm tra send secret (cùng cửa với /personal-messages/send),
     * lỗi cấu hình phía mình — tuyệt đối không hiểu thành mất phiên Zalo.
     *
     * @param  array<string, mixed>  $body
     */
    private function classify(int $status, array $body): string
    {
        $code = (string) ($body['code'] ?? '');

        if (in_array($code, self::BRIDGE_CODES, true)) {
            return $code;
        }

        if ($status === 503 || $status === 403) {
            return self::ERROR_SECRET_MISMATCH;
        }

        return self::ERROR_UNKNOWN;
    }

    /** @return array{ok: bool, code: string, message: string} */
    private function failure(string $code, Message $message, ?string $detail = null): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'message' => __("errors.zalo.action.{$code}", ['detail' => (string) $detail], $message->inbox->account->locale),
        ];
    }

    private function channel(Conversation $conversation): Zalo
    {
        /** @var Zalo $channel */
        $channel = $conversation->inbox->channel;

        return $channel;
    }

    private function firstSourceId(Message $message): ?string
    {
        return $this->allSourceIds($message)[0] ?? null;
    }

    /**
     * `source_id` là msgId chính; `external_source_ids` (do SendOnZaloService ghi)
     * là mọi msgId của cùng một tin lõi.
     *
     * @return list<string>
     */
    private function allSourceIds(Message $message): array
    {
        $aliases = $message->content_attributes['external_source_ids'] ?? [];
        $ids = is_array($aliases) ? $aliases : [];

        if (filled($message->source_id)) {
            array_unshift($ids, $message->source_id);
        }

        $ids = array_map(fn ($id) => is_scalar($id) ? (string) $id : '', $ids);

        return array_values(array_unique(array_filter($ids, fn (string $id) => $id !== '')));
    }

    /** zca cần cả cliMsgId; chỉ tin đã có ảnh chụp `zca_message` mới biết được. */
    private function clientMessageId(Message $message): ?string
    {
        $snapshot = $message->content_attributes['zca_message'] ?? null;
        $cliMsgId = is_array($snapshot) ? ($snapshot['cliMsgId'] ?? null) : null;

        return filled($cliMsgId) ? (string) $cliMsgId : null;
    }
}
