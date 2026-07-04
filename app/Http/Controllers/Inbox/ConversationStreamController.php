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

        // P03 — reactions cho trang hiện tại: 1 query gộp, không N+1
        $reactionsByMessage = $this->fetchReactions(
            $page->where('item_type', 'message')->pluck('id')->all()
        );

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
            'items' => $page->map(fn ($item) => $this->formatItem($item, $reactionsByMessage)),
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
                 sender_uid, sender_name, sent_by, created_at,
                 recalled_at, delivered_at, seen_at",
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

    /**
     * P03 — reactions của các message trong trang, group theo message_id (1 query).
     *
     * @param  list<string>  $messageIds
     * @return array<string, list<array{reactor_uid: string, icon: string, reacted_at: string}>>
     */
    private function fetchReactions(array $messageIds): array
    {
        if ($messageIds === []) {
            return [];
        }

        return DB::table('message_reactions')
            ->whereIn('message_id', $messageIds)
            ->orderBy('reacted_at')
            ->get(['message_id', 'reactor_uid', 'icon', 'reacted_at'])
            ->groupBy('message_id')
            ->map(fn ($rows) => $rows->map(fn ($r) => [
                'reactor_uid' => $r->reactor_uid,
                'icon' => $r->icon,
                'reacted_at' => $r->reacted_at,
            ])->values()->all())
            ->all();
    }

    /**
     * @param  array<string, list<array<string, string>>>  $reactionsByMessage
     * @return array<string, mixed>
     */
    private function formatItem(object $item, array $reactionsByMessage = []): array
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
            // P03 — message-state đi theo tin (P02 pipeline ghi)
            'recalled_at' => $item->recalled_at,
            'delivered_at' => $item->delivered_at,
            'seen_at' => $item->seen_at,
            'reactions' => $reactionsByMessage[$item->id] ?? [],
        ];
    }
}
