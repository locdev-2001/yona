<?php

namespace App\Finders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Mention;
use App\Models\User;
use App\Services\SearchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

// Port từ refs/chatwoot/app/finders/conversation_finder.rb.
// Bỏ: custom view (E1).
class ConversationFinder
{
    public const RESULTS_PER_PAGE = 25;

    private const DEFAULT_STATUS = 'open';

    // Bảng SORT_OPTIONS: tham số sort_by → [scope, hướng].
    private const SORT_OPTIONS = [
        'last_activity_at_asc' => ['sortOnLastActivityAt', 'asc'],
        'last_activity_at_desc' => ['sortOnLastActivityAt', 'desc'],
        'created_at_asc' => ['sortOnCreatedAt', 'asc'],
        'created_at_desc' => ['sortOnCreatedAt', 'desc'],
        'priority_asc' => ['sortOnPriority', 'asc'],
        'priority_desc' => ['sortOnPriority', 'desc'],
        'waiting_since_asc' => ['sortOnWaitingSince', 'asc'],
        'waiting_since_desc' => ['sortOnWaitingSince', 'desc'],
        'priority_desc_created_at_asc' => ['sortOnPriorityCreatedAt', 'desc'],
        'unread' => ['sortOnUnread', 'desc'],
        // Alias cũ (to be removed in v3.5.0 — giữ để tương thích).
        'latest' => ['sortOnLastActivityAt', 'desc'],
        'sort_on_created_at' => ['sortOnCreatedAt', 'asc'],
        'sort_on_priority' => ['sortOnPriority', 'desc'],
        'sort_on_waiting_since' => ['sortOnWaitingSince', 'asc'],
    ];

    /** @var Builder<Conversation> */
    private Builder $conversations;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly User $currentUser,
        private readonly Account $currentAccount,
        private readonly AccountUser $currentAccountUser,
        private readonly array $params,
    ) {}

    /** @return array{conversations: Collection<int, Conversation>, count: array<string, int>} */
    public function perform(): array
    {
        $this->setUp();

        [$mineCount, $unassignedCount, $allCount] = $this->countForAllConversations();

        $this->filterByAssigneeType();

        return [
            'conversations' => $this->fetchConversations(),
            'count' => [
                'mine_count' => $mineCount,
                'assigned_count' => $allCount - $unassignedCount,
                'unassigned_count' => $unassignedCount,
                'all_count' => $allCount,
            ],
        ];
    }

    /** @return array{count: array<string, int>} */
    public function performMetaOnly(): array
    {
        $this->setUp();

        [$mineCount, $unassignedCount, $allCount] = $this->countForAllConversations();

        return [
            'count' => [
                'mine_count' => $mineCount,
                'assigned_count' => $allCount - $unassignedCount,
                'unassigned_count' => $unassignedCount,
                'all_count' => $allCount,
            ],
        ];
    }

    private function setUp(): void
    {
        $this->findAllConversations();
        $this->filterByConversationType();
        $this->filterByStatus();
        $this->filterByTeam();
        $this->filterByLabels();
        $this->filterBySourceId();
        self::filterBySearchQuery($this->conversations, $this->currentUser, $this->currentAccount, $this->params['q'] ?? null);
    }

    /**
     * Ô tìm trong cột danh sách hội thoại: chỉ giữ hội thoại khớp từ khoá theo luật
     * và phân quyền của SearchService, mọi bộ lọc khác của danh sách giữ nguyên.
     * Dùng chung cho danh sách thường và danh sách lọc nâng cao.
     *
     * @param  Builder<Conversation>  $conversations
     */
    public static function filterBySearchQuery(Builder $conversations, User $user, Account $account, mixed $query): void
    {
        if (! is_string($query) || trim($query) === '') {
            return;
        }

        $conversations->whereIn(
            'conversations.id',
            (new SearchService($user, $account, ['q' => $query], 'Conversation'))->matchingConversationIds(),
        );
    }

    private function findAllConversations(): void
    {
        $this->conversations = Conversation::query()->where('account_id', $this->currentAccount->id);

        $assignedInboxIds = $this->currentUser
            ->assignedInboxes($this->currentAccount, $this->currentAccountUser)
            ->pluck('id');

        if (filled($this->params['inbox_id'] ?? null)) {
            $this->conversations->whereIn(
                'inbox_id',
                $assignedInboxIds->intersect([(int) $this->params['inbox_id']])->values()
            );
        }

        // PermissionFilterService: admin thấy hết, agent chỉ thấy inbox mình là member.
        if (! $this->currentAccountUser->isAdministrator()) {
            $this->conversations->whereIn('inbox_id', $assignedInboxIds->values());
        }
    }

    private function filterByStatus(): void
    {
        $status = $this->params['status'] ?? self::DEFAULT_STATUS;

        if ($status === 'all') {
            return;
        }

        $this->conversations->where('status', Conversation::statusFromName($status));
    }

    private function filterByTeam(): void
    {
        if (blank($this->params['team_id'] ?? null)) {
            return;
        }

        $team = $this->currentAccount->teams()->findOrFail($this->params['team_id']);
        $this->conversations->where('team_id', $team->id);
    }

    // conversation_finder.rb#filter_by_labels: tagged_with(any: true) — khớp BẤT KỲ
    // nhãn nào trong danh sách, không phải tất cả.
    private function filterByLabels(): void
    {
        $titles = array_filter((array) ($this->params['labels'] ?? []));

        if ($titles === []) {
            return;
        }

        $this->conversations->whereHas(
            'labels',
            fn (Builder $query) => $query->whereIn('title', $titles)
        );
    }

    private function filterBySourceId(): void
    {
        if (blank($this->params['source_id'] ?? null)) {
            return;
        }

        $this->conversations->whereHas(
            'contactInbox',
            fn (Builder $query) => $query->where('source_id', $this->params['source_id'])
        );
    }

    // conversation_finder.rb#filter_by_conversation_type — chạy trước khi đếm nên
    // meta.all_count bám theo tab đang chọn.
    private function filterByConversationType(): void
    {
        $type = $this->params['conversation_type'] ?? null;

        match ($type) {
            'unattended' => $this->conversations->unattended(),
            'mention' => $this->conversations->whereIn(
                'conversations.id',
                Mention::query()
                    ->where('account_id', $this->currentAccount->id)
                    ->where('user_id', $this->currentUser->id)
                    ->select('conversation_id')
            ),
            'participating' => $this->conversations->whereIn(
                'conversations.id',
                ConversationParticipant::query()
                    ->where('account_id', $this->currentAccount->id)
                    ->where('user_id', $this->currentUser->id)
                    ->select('conversation_id')
            ),
            default => $this->conversations,
        };
    }

    private function filterByAssigneeType(): void
    {
        match ($this->params['assignee_type'] ?? null) {
            'me' => $this->conversations->assignedTo($this->currentUser),
            'unassigned' => $this->conversations->unassigned(),
            'assigned' => $this->conversations->assigned(),
            default => $this->conversations,
        };
    }

    /** @return array{0: int, 1: int, 2: int} */
    private function countForAllConversations(): array
    {
        $counts = $this->conversations->clone()
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) AS mine_count', [$this->currentUser->id])
            ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) AS unassigned_count')
            ->selectRaw('COUNT(*) AS all_count')
            ->toBase()
            ->first();

        return [(int) $counts->mine_count, (int) $counts->unassigned_count, (int) $counts->all_count];
    }

    /** @return Collection<int, Conversation> */
    private function fetchConversations(): Collection
    {
        [$sortScope, $sortDirection] = self::SORT_OPTIONS[$this->params['sort_by'] ?? null]
            ?? self::SORT_OPTIONS['last_activity_at_desc'];

        $query = $this->conversations
            ->with(['inbox', 'assignee.avatar', 'contact.avatar', 'team', 'contactInbox'])
            ->{$sortScope}($sortDirection);

        // updated_within (giây): FE realtime đồng bộ lại sau khi mất kết nối —
        // trả hết trong khoảng thời gian, không phân trang (filter_by_updated_at).
        if (filled($this->params['updated_within'] ?? null)) {
            return $query
                ->where('conversations.updated_at', '>', now()->subSeconds((int) $this->params['updated_within']))
                ->get();
        }

        $page = max(1, (int) ($this->params['page'] ?? 1));

        return $query
            ->offset(($page - 1) * self::RESULTS_PER_PAGE)
            ->limit(self::RESULTS_PER_PAGE)
            ->get();
    }
}
