<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

// Ghim theo từng nhân viên: người này ghim không làm đổi danh sách của người khác.
// Quyền xem hội thoại kiểm ở tầng gọi (fetchConversationForUser) trước khi ghim.
// Nhóm ghim của một người trong một account xếp theo `position` tăng dần.
class ConversationPin extends Model
{
    protected $fillable = [
        'account_id',
        'user_id',
        'conversation_id',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    // Ghim mới đứng đầu nhóm ghim: nhỏ hơn vị trí nhỏ nhất đang có một đơn vị.
    public static function pin(User $user, Conversation $conversation): void
    {
        $now = now();
        $topPosition = self::query()
            ->where('account_id', $conversation->account_id)
            ->where('user_id', $user->id)
            ->selectRaw('COALESCE(MIN(position), 0) - 1');

        self::query()->insertOrIgnoreUsing(
            ['account_id', 'user_id', 'conversation_id', 'position', 'created_at', 'updated_at'],
            DB::query()->selectRaw('?::bigint, ?::bigint, ?::bigint, ('.$topPosition->toSql().'), ?::timestamp, ?::timestamp', [
                $conversation->account_id,
                $user->id,
                $conversation->id,
                ...$topPosition->getBindings(),
                $now,
                $now,
            ]),
        );
    }

    public static function unpin(User $user, Conversation $conversation): void
    {
        self::query()
            ->where('user_id', $user->id)
            ->where('conversation_id', $conversation->id)
            ->delete();
    }

    /**
     * Vị trí ghim theo khoá chính hội thoại, đã xếp đúng thứ tự nhóm ghim; có thể
     * giới hạn trong một nhóm hội thoại cho sẵn.
     *
     * @param  iterable<int>|null  $amongConversationIds
     * @return array<int, int>
     */
    public static function positionsPinnedBy(User $user, int $accountId, ?iterable $amongConversationIds = null): array
    {
        $query = self::query()
            ->where('account_id', $accountId)
            ->where('user_id', $user->id)
            ->orderBy('position')
            ->orderByDesc('id');

        if ($amongConversationIds !== null) {
            $query->whereIn('conversation_id', collect($amongConversationIds)->all());
        }

        return $query->pluck('position', 'conversation_id')
            ->mapWithKeys(fn ($position, $conversationId) => [(int) $conversationId => (int) $position])
            ->all();
    }

    /**
     * Khoá chính các hội thoại người này đã ghim trong account, theo thứ tự nhóm ghim.
     *
     * @param  iterable<int>|null  $amongConversationIds
     * @return list<int>
     */
    public static function conversationIdsPinnedBy(User $user, int $accountId, ?iterable $amongConversationIds = null): array
    {
        return array_keys(self::positionsPinnedBy($user, $accountId, $amongConversationIds));
    }

    /**
     * Xếp lại các hội thoại cho sẵn (mã hội thoại theo account) đúng thứ tự gửi lên.
     * Chúng đổi chỗ cho nhau trong đúng những ô đang chiếm, nên ghim không có mặt
     * trong danh sách (khác hộp thư, khác bộ lọc) giữ nguyên chỗ. Mã không thuộc
     * nhóm ghim của người này bị bỏ qua. Cả nhóm được đánh số lại liền 0..n-1.
     *
     * @param  list<int>  $orderedDisplayIds
     * @return array<int, int> vị trí mới của cả nhóm ghim, theo mã hội thoại
     */
    public static function reorder(User $user, int $accountId, array $orderedDisplayIds): array
    {
        return DB::transaction(function () use ($user, $accountId, $orderedDisplayIds) {
            $pins = self::query()
                ->join('conversations', 'conversations.id', '=', 'conversation_pins.conversation_id')
                ->where('conversation_pins.account_id', $accountId)
                ->where('conversation_pins.user_id', $user->id)
                ->orderBy('conversation_pins.position')
                ->orderByDesc('conversation_pins.id')
                ->lockForUpdate()
                ->get(['conversation_pins.id', 'conversation_pins.position', 'conversations.display_id']);

            $currentOrder = $pins->pluck('display_id')->map(fn ($id) => (int) $id)->all();
            $requested = array_values(array_intersect(array_values(array_unique($orderedDisplayIds)), $currentOrder));
            $requestedSet = array_flip($requested);
            $slots = array_keys(array_filter($currentOrder, fn (int $displayId) => isset($requestedSet[$displayId])));

            $newOrder = $currentOrder;
            foreach ($slots as $index => $slot) {
                $newOrder[$slot] = $requested[$index];
            }

            $pinsByDisplayId = $pins->keyBy(fn (self $pin) => (int) $pin->getAttribute('display_id'));
            $positions = [];

            foreach ($newOrder as $position => $displayId) {
                $positions[$displayId] = $position;
                $pin = $pinsByDisplayId[$displayId];

                if ($pin->position !== $position) {
                    self::query()->whereKey($pin->id)->update(['position' => $position, 'updated_at' => now()]);
                }
            }

            return $positions;
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
