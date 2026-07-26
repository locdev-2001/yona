<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Delivery;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\ZaloConnection;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloNotConnectedException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

/**
 * P06a — client DUY NHẤT cho dispatcher generic `/zca/:method` (action
 * non-outbound, non-destructive: addReaction, getStickers, findUser...).
 * Outbound có nội dung (text/media/sticker/quote) VẪN đi /personal-messages/send.
 *
 * B1: workspace_token = HMAC(connection_id:workspace_id_của_SESSION) — bridge so
 * với slot binding lúc promote; sai workspace → 403 fail-closed (test điều kiện GO).
 * Rủi ro #1 (khóa acc): reaction throttle ≤5/10s/connection, KHÔNG burst.
 */
class ZaloInteractionService
{
    private const REACTION_MAX_PER_10S = 5;

    /**
     * Thả/gỡ reaction lên tin — gate meta TRƯỚC khi gọi (HIGH-1): thiếu
     * msgId/cliMsgId = không gọi được API, caller phải 422 chứ KHÔNG optimistic.
     * icon '' = NONE (gỡ).
     *
     * @throws ZaloNotConnectedException|\InvalidArgumentException|\RuntimeException
     */
    public function addReaction(Conversation $conversation, Message $message, string $icon): void
    {
        $zca = $message->platform_meta['zca_message'] ?? [];
        if (empty($zca['msgId']) || empty($zca['cliMsgId'])) {
            throw new \InvalidArgumentException('reaction_unavailable');
        }

        $connection = $this->resolveConnection($conversation);

        $rateKey = 'zalo-reaction:'.$connection->connection_id;
        if (! RateLimiter::attempt($rateKey, self::REACTION_MAX_PER_10S, fn () => true, 10)) {
            throw new \RuntimeException('reaction_rate_limited');
        }

        $response = $this->dispatch($connection, $conversation->workspace_id, 'addReaction', [
            $icon,
            [
                'data' => [
                    'msgId' => (string) $zca['msgId'],
                    'cliMsgId' => (string) $zca['cliMsgId'],
                ],
                'threadId' => $conversation->sender_uid,
                'type' => $conversation->thread_type === 1 ? 1 : 0,
            ],
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('reaction_failed: '.($response->json('message') ?? $response->status()));
        }
    }

    /**
     * Sticker picker = ô SEARCH (validate): keyword → getStickers (ids) →
     * getStickersDetail. Cache theo (account, keyword) 1h — không gọi lại API
     * không chính thức cho cùng keyword.
     *
     * @return list<array{id: int, cateId: int, type: int, url: string|null, thumbnail: string|null, description: string|null}>
     */
    public function searchStickers(Conversation $conversation, string $keyword): array
    {
        $connection = $this->resolveConnection($conversation);
        $cacheKey = sprintf('zalo-stickers:%s:%s', $conversation->channel_account_id, mb_strtolower(trim($keyword)));

        return Cache::remember($cacheKey, now()->addHour(), function () use ($connection, $conversation, $keyword) {
            $idsResponse = $this->dispatch($connection, $conversation->workspace_id, 'getStickers', [$keyword]);
            if (! $idsResponse->successful()) {
                throw new \RuntimeException('sticker_search_failed');
            }

            $ids = array_slice(array_filter((array) $idsResponse->json('result'), 'is_numeric'), 0, 24);
            if ($ids === []) {
                return [];
            }

            $detailResponse = $this->dispatch($connection, $conversation->workspace_id, 'getStickersDetail', [array_values($ids)]);
            if (! $detailResponse->successful()) {
                throw new \RuntimeException('sticker_search_failed');
            }

            $details = (array) $detailResponse->json('result');

            return array_values(array_map(fn (array $d) => [
                'id' => (int) ($d['id'] ?? 0),
                'cateId' => (int) ($d['cateId'] ?? 0),
                'type' => (int) ($d['type'] ?? 1),
                'url' => $d['stickerUrl'] ?? $d['stickerWebpUrl'] ?? null,
                'thumbnail' => $d['stickerSpriteUrl'] ?? $d['stickerUrl'] ?? null,
                'description' => $d['text'] ?? null,
            ], array_filter($details, 'is_array')));
        });
    }

    /**
     * P06b — báo "đã xem" về Zalo cho batch tin inbound (≤50 — MAX_MESSAGES_PER_SEND).
     * CHỈ 1-1 (group seen per-member, v1 bỏ). Message thiếu field bắt buộc bị loại
     * (sendSeenEvent cần msgId/cliMsgId/uidFrom/idTo/msgType — sendSeenEvent.ts).
     *
     * @param  list<array<string, mixed>>  $zcaMessages  platform_meta.zca_message của các tin inbound
     * @return bool true nếu có gửi (≥1 tin hợp lệ + dispatcher 2xx)
     */
    public function sendSeenBatch(Conversation $conversation, array $zcaMessages): bool
    {
        $valid = array_values(array_filter($zcaMessages, function ($zca) {
            foreach (['msgId', 'cliMsgId', 'uidFrom', 'idTo', 'msgType'] as $field) {
                if (! isset($zca[$field]) || $zca[$field] === '') {
                    return false;
                }
            }

            return true;
        }));

        if ($valid === [] || $conversation->thread_type === 1) {
            return false;
        }

        $connection = $this->resolveConnection($conversation);
        $response = $this->dispatch($connection, $conversation->workspace_id, 'sendSeenEvent', [
            array_slice($valid, 0, 50),
            0, // ThreadType.User
        ]);

        return $response->successful();
    }

    /**
     * P05 — verify SĐT nhập tay: findUser(phone) chiều xuôi, uid phải khớp sender_uid.
     * false = không resolve được HOẶC uid không khớp (LOW-2: reject cả 2 nhánh).
     */
    public function verifyPeerPhone(Conversation $conversation, string $phone): bool
    {
        $connection = $this->resolveConnection($conversation);
        $response = $this->dispatch($connection, $conversation->workspace_id, 'findUser', [$phone]);

        if (! $response->successful()) {
            if ($response->status() >= 500) {
                return false; // findUser không resolve (số không dùng Zalo) → zca throw → bridge 500
            }
            throw new ZaloNotConnectedException('Bridge từ chối ('.$response->status().'). Kiểm tra kết nối Zalo.');
        }

        $result = $response->json('result');
        $uid = $result['uid'] ?? $result['userId'] ?? $result['globalId'] ?? null;

        return $uid !== null && (string) $uid === $conversation->sender_uid;
    }

    /** @throws ZaloNotConnectedException */
    private function resolveConnection(Conversation $conversation): ZaloConnection
    {
        if (! $conversation->channel_account_id) {
            throw new ZaloNotConnectedException('Hội thoại chưa gắn tài khoản Zalo.');
        }

        $slots = ZaloConnection::connectedForAccount($conversation->workspace_id, $conversation->channel_account_id);
        if ($slots->count() !== 1) {
            throw new ZaloNotConnectedException('Tài khoản Zalo cần quét lại QR.');
        }

        return $slots->first();
    }

    /**
     * @param  array<int, mixed>  $args
     *
     * @throws ZaloNotConnectedException
     */
    private function dispatch(ZaloConnection $connection, string $workspaceId, string $method, array $args): Response
    {
        $secret = (string) config('services.zalo_bridge.send_secret', '');
        $connectionId = (string) $connection->connection_id;

        try {
            return Http::asJson()
                ->withHeader('X-Bridge-Send-Secret', $secret)
                ->timeout(15)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/zca/'.$method, [
                    'connection_id' => (int) $connectionId,
                    'workspace_token' => hash_hmac('sha256', $connectionId.':'.$workspaceId, $secret),
                    'args' => $args,
                ]);
        } catch (\Exception $e) {
            throw new ZaloNotConnectedException('Không thể kết nối bridge Zalo: '.$e->getMessage());
        }
    }
}
