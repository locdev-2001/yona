<?php

namespace App\Services\Zalo;

use App\Messaging\Inbound\Events\InboundEvent;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Models\Channel\Zalo;

/**
 * Bóc tách envelope `relay_event` của bridge về dữ liệu trung tính cho lõi.
 *
 * `payload` là MẢNG THAM SỐ mà listener zca-js phát ra, không phải object phẳng:
 *   - reaction / undo / typing : `payload[0]` = `{data:{…}, threadId, isSelf}`
 *   - seen / delivered        : `payload[0]` = MẢNG các `{data:{msgId,…}}`
 * (xem `node_modules/zca-js/dist/apis/listen.d.ts` — `ListenerEvents`).
 * Mọi đặc thù hình dạng đó sống ở đây; lõi (MessageEventService) chỉ nhận sự kiện trung tính.
 */
class RelayEventParser
{
    /**
     * Một envelope relay → các sự kiện trung tính của lõi. Mã cảm xúc của Zalo đổi
     * sang emoji ở đây; rỗng = gỡ.
     *
     * @param  array<int|string, mixed>  $payload
     * @return list<InboundEvent>
     */
    public static function events(string $eventType, array $payload): array
    {
        return match ($eventType) {
            'undo' => array_values(array_filter([
                ($sourceId = self::recallSourceId($payload)) === null ? null : new RecallEvent($sourceId),
            ])),
            'reaction', 'old_reactions' => array_map(
                fn (array $reaction) => new ReactionEvent(
                    targetSourceId: $reaction['source_id'],
                    emoji: $reaction['icon'] === '' ? null : ReactionIcons::emoji($reaction['icon']),
                    actor: $reaction['by'] === '' ? null : $reaction['by'],
                    isSelf: $reaction['is_self'],
                ),
                self::reactions($payload),
            ),
            'seen_messages' => [ReceiptEvent::read(self::receiptSourceIds($payload))],
            'delivered_messages' => [ReceiptEvent::delivered(self::receiptSourceIds($payload))],
            default => [],
        };
    }

    /**
     * Biên nhận seen/delivered — `msgId` của từng tin trong lô.
     *
     * `isSelf` = biên nhận do CHÍNH tài khoản của tenant sinh ra (selfListen dội
     * lại khi chủ shop đọc trên điện thoại). Không phải khách đã xem, nên bỏ.
     *
     * @param  array<int|string, mixed>  $payload
     * @return list<string>
     */
    public static function receiptSourceIds(array $payload): array
    {
        $items = is_array($payload[0] ?? null) ? $payload[0] : $payload;
        $ids = [];

        foreach ($items as $item) {
            if (is_array($item) && ($item['isSelf'] ?? false) === true) {
                continue;
            }

            $id = is_array($item) ? ($item['data']['msgId'] ?? $item['msgId'] ?? null) : $item;

            if (filled($id)) {
                $ids[] = (string) $id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Reaction — tin bị thả cảm xúc nằm ở `content.rMsg[*].gMsgID`, mã cảm xúc ở
     * `content.rIcon` (chuỗi rỗng = gỡ cảm xúc). `uidFrom` cho biết AI thả: thiếu
     * nó thì một người gỡ sẽ xoá cảm xúc của tất cả (audit 4.2).
     *
     * @param  array<int|string, mixed>  $payload
     * @return list<array{source_id: string, icon: string, by: string, is_self: bool}>
     */
    public static function reactions(array $payload): array
    {
        $events = is_array($payload[0] ?? null) && array_is_list($payload[0])
            ? $payload[0]          // old_reactions: mảng Reaction
            : [$payload[0] ?? []]; // reaction: một Reaction

        $reactions = [];

        foreach ($events as $event) {
            $data = is_array($event) ? ($event['data'] ?? []) : [];
            $content = is_array($data['content'] ?? null) ? $data['content'] : [];
            $icon = (string) ($content['rIcon'] ?? '');
            $isSelf = ($event['isSelf'] ?? false) === true;
            $by = (string) ($data['uidFrom'] ?? ($event['threadId'] ?? ''));

            foreach ($content['rMsg'] ?? [] as $target) {
                $sourceId = $target['gMsgID'] ?? null;

                if (filled($sourceId)) {
                    $reactions[] = [
                        'source_id' => (string) $sourceId,
                        'icon' => $icon,
                        'by' => $by,
                        'is_self' => $isSelf,
                    ];
                }
            }
        }

        return $reactions;
    }

    /**
     * Thu hồi — tin bị xoá nằm ở `content.globalMsgId` (KHÔNG phải `msgId` ở tầng
     * ngoài; `msgId` là định danh của chính sự kiện thu hồi).
     *
     * @param  array<int|string, mixed>  $payload
     */
    public static function recallSourceId(array $payload): ?string
    {
        return self::recallSourceIdFromContent($payload[0]['data']['content'] ?? null);
    }

    /**
     * Cùng một `content.globalMsgId` nhưng đến theo đường BACKFILL: lane kéo lịch
     * sử gửi item `chat.undo` như một tin thường (`listener_data`), không có
     * envelope relay. Lô 2 dùng accessor này để áp thu hồi thay vì chỉ bỏ qua.
     *
     * @param  array<string, mixed>  $listenerData
     */
    public static function backfillRecallSourceId(array $listenerData): ?string
    {
        return self::recallSourceIdFromContent($listenerData['content'] ?? null);
    }

    /**
     * Khách đang gõ — chỉ cần biết luồng nào; `isSelf` luôn false theo type zca
     * (`models/Typing.d.ts`) nhưng vẫn chặn để tin của chính tenant không bật
     * "đang nhập…" trên máy agent.
     *
     * @param  array<int|string, mixed>  $payload
     */
    public static function typingThreadId(array $payload): ?string
    {
        $event = is_array($payload[0] ?? null) ? $payload[0] : [];

        if (($event['isSelf'] ?? false) === true) {
            return null;
        }

        $data = is_array($event['data'] ?? null) ? $event['data'] : [];
        $threadId = $event['threadId'] ?? $data['gid'] ?? $data['uid'] ?? null;

        return filled($threadId) ? (string) $threadId : null;
    }

    /**
     * Thành viên đang gõ trong NHÓM (`data.uid`, còn `threadId` là nhóm). Luồng
     * 1-1 trả null vì người gõ chính là liên hệ của hội thoại.
     *
     * @param  array<int|string, mixed>  $payload
     */
    public static function typingGroupMemberId(array $payload): ?string
    {
        $event = is_array($payload[0] ?? null) ? $payload[0] : [];
        $data = is_array($event['data'] ?? null) ? $event['data'] : [];
        $isGroup = (int) ($event['type'] ?? 0) === Zalo::THREAD_TYPE_GROUP || filled($data['gid'] ?? null);
        $memberId = $data['uid'] ?? null;

        return $isGroup && is_scalar($memberId) && filled($memberId) ? (string) $memberId : null;
    }

    private static function recallSourceIdFromContent(mixed $content): ?string
    {
        $globalMsgId = is_array($content) ? ($content['globalMsgId'] ?? null) : null;

        return filled($globalMsgId) ? (string) $globalMsgId : null;
    }
}
