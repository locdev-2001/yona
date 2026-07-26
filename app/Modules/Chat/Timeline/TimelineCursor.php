<?php

namespace App\Modules\Chat\Timeline;

/**
 * P05 (inbox-multichannel-relayer) — encode/decode cursor keyset
 * (stream_at, stream_rank, id) cho ConversationStreamController. Cursor
 * opaque với FE — chỉ round-trip lại nguyên văn cho request trang kế.
 */
class TimelineCursor
{
    public static function encode(string $streamAt, int $streamRank, string $id): string
    {
        return base64_encode(json_encode([$streamAt, $streamRank, $id]));
    }

    /** @return array{0: string, 1: int, 2: string}|null */
    public static function decode(?string $cursor): ?array
    {
        if ($cursor === null || $cursor === '') {
            return null;
        }

        $decoded = json_decode(base64_decode($cursor, true) ?: '', true);

        if (! is_array($decoded) || count($decoded) !== 3) {
            return null;
        }

        return [(string) $decoded[0], (int) $decoded[1], (string) $decoded[2]];
    }
}
