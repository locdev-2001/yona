<?php

namespace App\Finders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

// Port từ refs/chatwoot/app/finders/conversation_finder.rb.
// Bỏ ở B3: labels (B7), custom view/PermissionFilterService (EE — CE cho qua),
// conversation_type mention/participating (B11) + unattended (B8), q search (E2),
// sort unread/last_user_message (B8).
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
        $this->filterByStatus();
        $this->filterByTeam();
        $this->filterBySourceId();
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
