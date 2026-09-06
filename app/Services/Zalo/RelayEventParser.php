<?php

namespace App\Services\Zalo;

/**
 * Bóc tách envelope `relay_event` của bridge về dữ liệu trung tính cho lõi.
 *
 * `payload` là MẢNG THAM SỐ mà listener zca-js phát ra, không phải object phẳng:
 *   - reaction / undo : `payload[0]` = `{data:{…}, threadId, isSelf}`
 *   - seen / delivered: `payload[0]` = MẢNG các `{data:{msgId,…}}`
 * (xem `node_modules/zca-js/dist/apis/listen.d.ts` — `ListenerEvents`).
 * Mọi đặc thù hình dạng đó sống ở đây, MessageStateService chỉ nhận source_id.
 */
class RelayEventParser
{
    /**
     * Biên nhận seen/delivered — `msgId` của từng tin trong lô.
     *
     * @param  array<int|string, mixed>  $payload
     * @return list<string>
     */
    public static function receiptSourceIds(array $payload): array
    {
        $items = is_array($payload[0] ?? null) ? $payload[0] : $payload;
        $ids = [];

        foreach ($items as $item) {
            $id = is_array($item) ? ($item['data']['msgId'] ?? $item['msgId'] ?? null) : $item;

            if (filled($id)) {
                $ids[] = (string) $id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Reaction — tin bị thả cảm xúc nằm ở `content.rMsg[*].gMsgID`, mã cảm xúc ở
     * `content.rIcon` (chuỗi rỗng = gỡ cảm xúc).
     *
     * @param  array<int|string, mixed>  $payload
     * @return list<array{source_id: string, icon: string}>
     */
    public static function reactions(array $payload): array
    {
        $events = is_array($payload[0] ?? null) && array_is_list($payload[0])
            ? $payload[0]          // old_reactions: mảng Reaction
            : [$payload[0] ?? []]; // reaction: một Reaction

        $reactions = [];

        foreach ($events as $event) {
            $content = is_array($event) ? ($event['data']['content'] ?? []) : [];
            $icon = (string) ($content['rIcon'] ?? '');

            foreach ($content['rMsg'] ?? [] as $target) {
                $sourceId = $target['gMsgID'] ?? null;

                if (filled($sourceId)) {
                    $reactions[] = ['source_id' => (string) $sourceId, 'icon' => $icon];
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
        $globalMsgId = $payload[0]['data']['content']['globalMsgId'] ?? null;

        return filled($globalMsgId) ? (string) $globalMsgId : null;
    }
}
