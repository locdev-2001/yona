<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Intake;

use Illuminate\Support\Carbon;

/**
 * P02 — parse relay_event zca → DTO trung tính cho MessageStatusService (Rule 16:
 * shape platform sống ở driver, core mù zca).
 *
 * TARGET per-event, KHÔNG phải 1 resolver theo envelope source_id (Codex BLK-1,
 * đối chiếu services/zca-js-2.1.2/src/models + apis/listen.ts):
 *  - undo:      payload[0].data.content.globalMsgId  (data.msgId là id của HÀNH ĐỘNG undo)
 *  - reaction:  payload[0].data.content.rMsg[i].gMsgID (data.msgId là id của hành động thả)
 *  - seen/delivered: payload[0][i].data.msgId (list; trùng source_id outbound — đúng)
 * Envelope payload = args listener nguyên vẹn (sanitizePlain ở relay-forwarder).
 */
class ZaloStateEventParser
{
    /**
     * @param  array<int, mixed>  $payload
     * @return array{target_msg_id: string, recalled_at: Carbon|null, payload: array<string, mixed>}|null
     */
    public function parseUndo(array $payload): ?array
    {
        $data = $payload[0]['data'] ?? null;
        $target = $data['content']['globalMsgId'] ?? null;

        if ($target === null || (string) $target === '') {
            return null;
        }

        $recalledAt = $this->tsToCarbon($data['ts'] ?? null);

        return [
            'target_msg_id' => (string) $target,
            'recalled_at' => $recalledAt,
            'payload' => ['recalled_at' => $recalledAt?->toIso8601String()],
        ];
    }

    /**
     * seen_messages / delivered_messages: payload[0] = LIST {type, data, threadId}.
     * Nhóm (type=1 hoặc data.groupId) per-member → LOẠI ngay tại parser (guard cứng).
     *
     * @param  array<int, mixed>  $payload
     * @return list<array{target_msg_id: string, kind: string}>
     */
    public function parseReceipts(array $payload, string $kind): array
    {
        $items = is_array($payload[0] ?? null) ? $payload[0] : [];
        // Single object thay vì list (phòng shape lệch) → bọc lại
        if ($items !== [] && ! array_is_list($items)) {
            $items = [$items];
        }

        $receipts = [];
        foreach ($items as $item) {
            $data = $item['data'] ?? null;
            $msgId = $data['msgId'] ?? null;
            $isGroup = (int) ($item['type'] ?? 0) === 1 || isset($data['groupId']);

            if ($msgId === null || (string) $msgId === '' || $isGroup) {
                continue;
            }

            $receipts[] = ['target_msg_id' => (string) $msgId, 'kind' => $kind];
        }

        return $receipts;
    }

    /**
     * reaction: payload[0] = 1 Reaction · old_reactions: payload[0] = LIST Reaction.
     *
     * @param  array<int, mixed>  $payload
     * @return list<array{target_msg_id: string, reactor_uid: string, icon: string, reacted_at: Carbon}>
     */
    public function parseReactions(array $payload): array
    {
        $first = $payload[0] ?? null;
        if (! is_array($first)) {
            return [];
        }
        $items = array_is_list($first) ? $first : [$first];

        $reactions = [];
        foreach ($items as $item) {
            $data = $item['data'] ?? null;
            $reactorUid = $data['uidFrom'] ?? null;
            $rMsgs = $data['content']['rMsg'] ?? [];

            if ($reactorUid === null || ! is_array($rMsgs)) {
                continue;
            }

            foreach ($rMsgs as $rMsg) {
                $target = $rMsg['gMsgID'] ?? null;
                if ($target === null || (string) $target === '') {
                    continue;
                }

                $reactions[] = [
                    'target_msg_id' => (string) $target,
                    'reactor_uid' => (string) $reactorUid,
                    // rIcon '' = NONE (gỡ cảm xúc) — service xử lý delete
                    'icon' => mb_substr((string) ($data['content']['rIcon'] ?? ''), 0, 16),
                    'reacted_at' => $this->tsToCarbon($data['ts'] ?? null) ?? now(),
                ];
            }
        }

        return $reactions;
    }

    /**
     * typing: payload[0] = {type, data:{uid|gid, ts}, threadId}. Trả peer_uid
     * (= threadId: uid người gõ ở 1-1, gid ở nhóm) để resolve conversation.
     *
     * @param  array<int, mixed>  $payload
     * @return array{peer_uid: string, typist_uid: string|null}|null
     */
    public function parseTyping(array $payload): ?array
    {
        $item = $payload[0] ?? null;
        $threadId = $item['threadId'] ?? null;

        if ($threadId === null || (string) $threadId === '') {
            return null;
        }

        return [
            'peer_uid' => (string) $threadId,
            'typist_uid' => isset($item['data']['uid']) ? (string) $item['data']['uid'] : null,
        ];
    }

    private function tsToCarbon(mixed $ts): ?Carbon
    {
        $ms = is_numeric($ts) ? (int) $ts : null;

        return $ms !== null && $ms > 0 ? Carbon::createFromTimestampMs($ms) : null;
    }
}
