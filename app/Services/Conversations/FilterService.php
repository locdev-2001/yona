<?php

namespace App\Services\Conversations;

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\ConversationPin;
use App\Models\CustomAttributeDefinition;
use App\Models\User;
use App\Services\Filters\BaseFilterService;
use App\Services\Filters\FilterKeys;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

// Toàn bộ phần chung
// (kiểm payload, nối and/or, custom attribute) nằm ở BaseFilterService; ở đây
// chỉ còn phần riêng của hội thoại: phạm vi quyền, enum status/priority,
// assignee trên hai cột và bộ đếm mine/unassigned/all.
class FilterService extends BaseFilterService
{
    /** @param array<int, array<string, mixed>> $payload */
    public function __construct(
        private readonly User $user,
        Account $account,
        private readonly AccountUser $accountUser,
        array $payload,
        private readonly int $page = 1,
        private readonly ?string $searchQuery = null,
    ) {
        parent::__construct($account, $payload);
    }

    /** @return array{conversations: Collection<int, Conversation>, count: array<string, int>} */
    public function perform(): array
    {
        $conversations = $this->listScope();
        ConversationFinder::filterBySearchQuery($conversations, $this->user, $this->account, $this->searchQuery);

        $page = max(1, $this->page);

        $items = $conversations->clone()
            ->select('conversations.*')
            // Đếm cùng đúng một SQL snapshot với payload. Nếu status vừa đổi,
            // tách COUNT và SELECT thành hai query có thể tạo meta=0 nhưng card=1.
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) OVER() AS filter_mine_count', [$this->user->id])
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) OVER() AS filter_unassigned_count')
            ->selectRaw('COUNT(*) OVER() AS filter_all_count')
            ->with(['inbox', 'assignee.avatar', 'contact.avatar', 'team', 'contactInbox'])
            ->tap(fn (Builder $query) => $this->orderPinnedFirst($query))
            ->sortOnLastActivityAt('desc')
            ->offset(($page - 1) * ConversationFinder::RESULTS_PER_PAGE)
            ->limit(ConversationFinder::RESULTS_PER_PAGE)
            ->get();

        if ($items->isEmpty()) {
            [$mineCount, $unassignedCount, $allCount] = $this->counts($conversations);
        } else {
            $mineCount = (int) $items->first()->getAttribute('filter_mine_count');
            $unassignedCount = (int) $items->first()->getAttribute('filter_unassigned_count');
            $allCount = (int) $items->first()->getAttribute('filter_all_count');
        }

        return [
            'conversations' => $items,
            'count' => self::countPayload($mineCount, $unassignedCount, $allCount),
        ];
    }

    /**
     * Hội thoại khớp bộ lọc trong quyền người xem, trước khi lọc theo từ khoá —
     * phạm vi của ô tìm chia mục khi đang lọc nâng cao.
     *
     * @return Builder<Conversation>
     */
    public function listScope(): Builder
    {
        $conversations = $this->baseRelation();
        $this->applyPayload($conversations);

        return $conversations;
    }

    /** @return array<string, int> */
    private static function countPayload(int $mineCount, int $unassignedCount, int $allCount): array
    {
        return [
            'mine_count' => $mineCount,
            'assigned_count' => $allCount - $unassignedCount,
            'unassigned_count' => $unassignedCount,
            'all_count' => $allCount,
        ];
    }

    protected function standardAttributes(): array
    {
        return FilterKeys::CONVERSATIONS;
    }

    protected function tableName(): string
    {
        return 'conversations';
    }

    protected function customAttributeModel(): string
    {
        return CustomAttributeDefinition::MODEL_CONVERSATION;
    }

    /**
     * @param  Builder<Conversation>  $query
     * @param  array<int, mixed>  $values
     */
    protected function applyEntitySpecificColumn(Builder $query, string $attributeKey, string $operator, array $values): bool
    {
        match ($attributeKey) {
            'status' => $this->applyStatus($query, $operator, $values),
            'priority' => $this->applySet($query, 'conversations.priority', $operator, $this->enumValues(Conversation::PRIORITY_NAMES, $values)),
            'assignee_id' => $this->applyAssignee($query, $operator, $values),
            'display_id' => $this->applyDisplayId($query, $operator, $values),
            default => null,
        };

        return in_array($attributeKey, ['status', 'priority', 'assignee_id', 'display_id'], true);
    }

    /**
     * Danh sách lọc chỉ phân trang bằng `page` nên xếp nhóm ghim lên đầu ngay
     * trong ORDER BY, số đếm cửa sổ vẫn tính trên trọn tập khớp bộ lọc.
     *
     * @param  Builder<Conversation>  $query
     */
    private function orderPinnedFirst(Builder $query): void
    {
        $pinnedIds = ConversationPin::conversationIdsPinnedBy($this->user, $this->account->id);

        if ($pinnedIds !== []) {
            $query->orderByRaw('conversations.id = ANY(?::bigint[]) DESC', ['{'.implode(',', $pinnedIds).'}']);
        }
    }

    /** @return Builder<Conversation> */
    private function baseRelation(): Builder
    {
        $query = Conversation::query()->where('account_id', $this->account->id);

        if (! $this->accountUser->isAdministrator()) {
            $inboxIds = $this->user
                ->assignedInboxes($this->account, $this->accountUser)
                ->pluck('id');
            $query->whereIn('inbox_id', $inboxIds);
        }

        return $query;
    }

    /**
     * @param  Builder<Conversation>  $query
     * @param  array<int, mixed>  $values
     */
    private function applyStatus(Builder $query, string $operator, array $values): void
    {
        // conversation_status_values: "all" nghĩa là mọi trạng thái.
        if (in_array('all', $values, true)) {
            $query->whereRaw($operator === 'equal_to' ? '1 = 1' : '1 = 0');

            return;
        }

        $this->applySet($query, 'conversations.status', $operator, $this->enumValues(Conversation::STATUS_NAMES, $values));
    }

    /**
     * @param  Builder<Conversation>  $query
     * @param  array<int, mixed>  $values
     */
    private function applyAssignee(Builder $query, string $operator, array $values): void
    {
        // assignee_presence_filter: quyền sở hữu nằm ở một trong hai cột.
        if ($operator === 'is_present') {
            $query->where(fn (Builder $assigned) => $assigned
                ->whereNotNull('conversations.assignee_id')
                ->orWhereNotNull('conversations.assignee_agent_bot_id'));

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereNull('conversations.assignee_id')
                ->whereNull('conversations.assignee_agent_bot_id');

            return;
        }

        $this->applySet($query, 'conversations.assignee_id', $operator, $values);
    }

    /**
     * @param  Builder<Conversation>  $query
     * @param  array<int, mixed>  $values
     */
    private function applyDisplayId(Builder $query, string $operator, array $values): void
    {
        if (in_array($operator, ['equal_to', 'not_equal_to'], true)) {
            $this->applySet($query, 'conversations.display_id', $operator, $values);

            return;
        }

        // text_cast_filter: contains/does_not_contain trên số thứ tự đọc như chuỗi.
        $patterns = array_map(fn (mixed $value) => '%'.trim((string) $value).'%', $values);
        $placeholders = implode(', ', array_fill(0, count($patterns), '?'));
        $comparison = $operator === 'contains' ? 'ILIKE ANY' : 'NOT ILIKE ALL';

        $query->whereRaw("(conversations.display_id)::text {$comparison} (ARRAY[{$placeholders}])", $patterns);
    }

    /**
     * @param  Builder<Conversation>  $query
     * @param  array<int, mixed>  $values
     */
    private function applySet(Builder $query, string $column, string $operator, array $values): void
    {
        $operator === 'equal_to'
            ? $query->whereIn($column, $values)
            : $query->whereNotIn($column, $values);
    }

    /**
     * @param  array<int, string>  $names
     * @param  array<int, mixed>  $values
     * @return array<int, int>
     */
    private function enumValues(array $names, array $values): array
    {
        return collect($values)
            ->map(fn ($value) => array_search($value, $names, true))
            ->filter(fn ($value) => $value !== false)
            ->values()
            ->all();
    }

    /**
     * @param  Builder<Conversation>  $query
     * @return array{0: int, 1: int, 2: int}
     */
    private function counts(Builder $query): array
    {
        $counts = $query->clone()
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) AS mine_count', [$this->user->id])
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) AS unassigned_count')
            ->selectRaw('COUNT(*) AS all_count')
            ->toBase()
            ->first();

        return [(int) $counts->mine_count, (int) $counts->unassigned_count, (int) $counts->all_count];
    }
}
