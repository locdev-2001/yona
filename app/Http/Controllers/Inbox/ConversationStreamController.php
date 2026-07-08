<?php

namespace App\Http\Controllers\Inbox;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Services\Inbox\StreamCursor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * P05 — stream hợp nhất messages + conversation_events (gap marker), sort
 * chung (stream_at, stream_rank, id). Keyset cursor phân trang LÙI (tải tin
 * cũ hơn — không có cursor = trang mới nhất). stream_rank cố định theo kind
 * (message=0, session_gap=5) → deterministic khi trùng stream_at.
 *
 * Merge 2 truy vấn riêng (messages/events) trong PHP thay vì SQL UNION —
 * né type-coercion giữa media_meta (jsonb) và NULL literal, dễ đọc/test hơn.
 */
class ConversationStreamController extends Controller
{
    private const DEFAULT_LIMIT = 50;

    private const MESSAGE_RANK = 0;

    public function __invoke(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $limit = min(200, max(1, (int) $request->integer('limit', self::DEFAULT_LIMIT)));
        $cursor = StreamCursor::decode($request->string('cursor')->toString() ?: null);

        $messageItems = $this->fetchMessageItems($conversation->id, $cursor, $limit);
        $eventItems = $this->fetchEventItems($conversation->id, $cursor, $limit);

        $page = $messageItems->concat($eventItems)
            ->sortByDesc(fn ($item) => sprintf('%s|%03d|%s', $item->stream_at, $item->stream_rank, $item->id))
            ->values()
            ->take($limit)
            ->reverse()
            ->values();

        $hasMore = $messageItems->count() === $limit || $eventItems->count() === $limit;
        $nextCursor = null;
        if ($hasMore && $page->isNotEmpty()) {
            $oldest = $page->first();
            $nextCursor = StreamCursor::encode((string) $oldest->stream_at, (int) $oldest->stream_rank, (string) $oldest->id);
        }

        if ($cursor === null && $conversation->unread_count > 0) {
            Conversation::where('id', $conversation->id)->update(['unread_count' => 0]);
        }

        return response()->json([
            'items' => $page->map(fn ($item) => $this->formatItem($item)),
            'next_cursor' => $nextCursor,
            'stream_version' => $conversation->stream_version,
        ]);
    }

    /** @param array{0: string, 1: int, 2: string}|null $cursor */
    private function fetchMessageItems(string $conversationId, ?array $cursor, int $limit): Collection
    {
        $query = DB::table('messages')
            ->where('conversation_id', $conversationId)
            ->selectRaw(
                "id, 'message' as item_type, direction, type, body, media_url, media_meta, source_id,
                 COALESCE(platform_sent_at, created_at) as stream_at, ? as stream_rank,
                 sender_uid, sender_name, sent_by, created_at",
                [self::MESSAGE_RANK]
            );

        if ($cursor !== null) {
            [$cStreamAt, $cRank, $cId] = $cursor;
            $query->whereRaw('(COALESCE(platform_sent_at, created_at), ?, id) < (?, ?, ?)', [self::MESSAGE_RANK, $cStreamAt, $cRank, $cId]);
        }

        return $query->orderByRaw('COALESCE(platform_sent_at, created_at) DESC, id DESC')->limit($limit)->get();
    }

    /** @param array{0: string, 1: int, 2: string}|null $cursor */
    private function fetchEventItems(string $conversationId, ?array $cursor, int $limit): Collection
    {
        $query = DB::table('conversation_events')
            ->where('conversation_id', $conversationId)
            ->selectRaw('id, \'event\' as item_type, kind, gap_started_at, gap_ended_at, stream_at, stream_rank, created_at');

        if ($cursor !== null) {
            [$cStreamAt, $cRank, $cId] = $cursor;
            $query->whereRaw('(stream_at, stream_rank, id) < (?, ?, ?)', [$cStreamAt, $cRank, $cId]);
        }

        return $query->orderByDesc('stream_at')->orderByDesc('stream_rank')->orderByDesc('id')->limit($limit)->get();
    }

    /** @return array<string, mixed> */
    private function formatItem(object $item): array
    {
        if ($item->item_type === 'event') {
            return [
                'item_type' => 'event',
                'id' => $item->id,
                'kind' => $item->kind,
                'gap_started_at' => $item->gap_started_at,
                'gap_ended_at' => $item->gap_ended_at,
                'stream_at' => $item->stream_at,
            ];
        }

        return [
            'item_type' => 'message',
            'id' => $item->id,
            'direction' => $item->direction,
            'type' => $item->type,
            'body' => $item->body,
            'media_url' => $item->media_url,
            'media_meta' => $item->media_meta === null ? null : json_decode((string) $item->media_meta, true),
            'source_id' => $item->source_id,
            'platform_sent_at' => $item->stream_at,
            'sender_uid' => $item->sender_uid,
            'sender_name' => $item->sender_name,
            'sent_by' => $item->sent_by,
            'created_at' => $item->created_at,
        ];
    }
}
