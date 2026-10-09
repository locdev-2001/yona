<?php

namespace App\Finders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\ConversationPin;
use App\Models\Mention;
use App\Models\User;
use App\Services\SearchService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

// Bỏ: custom view (E1).
class ConversationFinder
{
    public const RESULTS_PER_PAGE = 25;

    private const DEFAULT_STATUS = 'open';

    // Bảng SORT_OPTIONS: tham số sort_by → [scope, hướng, cột con trỏ]. Cột con trỏ
    // null: sort theo biểu thức (priority, waiting_since, số chưa đọc) chỉ phân
    // trang bằng `page`; sort theo một cột thời gian phân trang được bằng `cursor`.
    private const SORT_OPTIONS = [
        'last_activity_at_asc' => ['sortOnLastActivityAt', 'asc', 'last_activity_at'],
        'last_activity_at_desc' => ['sortOnLastActivityAt', 'desc', 'last_activity_at'],
        'created_at_asc' => ['sortOnCreatedAt', 'asc', 'created_at'],
        'created_at_desc' => ['sortOnCreatedAt', 'desc', 'created_at'],
        'priority_asc' => ['sortOnPriority', 'asc', null],
        'priority_desc' => ['sortOnPriority', 'desc', null],
        'waiting_since_asc' => ['sortOnWaitingSince', 'asc', null],
        'waiting_since_desc' => ['sortOnWaitingSince', 'desc', null],
        'priority_desc_created_at_asc' => ['sortOnPriorityCreatedAt', 'desc', null],
        'unread' => ['sortOnUnread', 'desc', null],
        // Alias cũ (to be removed in v3.5.0 — giữ để tương thích).
        'latest' => ['sortOnLastActivityAt', 'desc', 'last_activity_at'],
        'sort_on_created_at' => ['sortOnCreatedAt', 'asc', 'created_at'],
        'sort_on_priority' => ['sortOnPriority', 'desc', null],
        'sort_on_waiting_since' => ['sortOnWaitingSince', 'asc', null],
    ];

    private const DEFAULT_SORT = 'last_activity_at_desc';

    private const CURSOR_TIMESTAMP_PATTERN = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/';

    // Số đếm tab chỉ cần tươi theo thay đổi hội thoại: khoá cache mang phiên bản
    // dữ liệu của account nên đổi hội thoại là đếm lại ngay, TTL chỉ là lưới an toàn.
    private const TAB_COUNTS_TTL_SECONDS = 10;

    private const TAB_COUNTS_FILTER_PARAMS = ['inbox_id', 'status', 'team_id', 'labels', 'source_id', 'q', 'conversation_type'];

    /** @var Builder<Conversation> */
    private Builder $conversations;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly User $currentUser,
        private readonly Account $currentAccount,
        private readonly AccountUser $currentAccountUser,
        private readonly array $params,
    ) {}

    /**
     * Có `cursor` thì bỏ số đếm tab: trang sau không đếm lại cả tập, số đếm lấy
     * riêng qua performMetaOnly.
     *
     * @return array{conversations: Collection<int, Conversation>, count: array<string, int>|null, next_cursor: string|null}
     */
    public function perform(): array
    {
        $this->setUp();

        $cursor = $this->requestedCursor();
        $count = $cursor === null ? $this->tabCounts() : null;

        $this->filterByAssigneeType();

        [$conversations, $nextCursor] = $this->fetchConversations($cursor);

        return [
            'conversations' => $conversations,
            'count' => $count,
            'next_cursor' => $nextCursor,
        ];
    }

    /** @return array{count: array<string, int>} */
    public function performMetaOnly(): array
    {
        $this->setUp();

        return ['count' => $this->tabCounts()];
    }

    // Mọi thay đổi hội thoại của account làm mới số đếm tab ngay.
    public static function forgetTabCounts(int $accountId): void
    {
        Cache::forever(self::tabCountsVersionKey($accountId), (string) hrtime(true));
    }

    /**
     * Hội thoại của danh sách đang xem (quyền, hộp thư, tab, trạng thái, nhãn, loại)
     * trước khi lọc theo từ khoá — phạm vi của ô tìm chia mục.
     *
     * @return Builder<Conversation>
     */
    public function listScope(?string $assigneeType = null): Builder
    {
        $this->applyListFilters();
        self::applyAssigneeTab($this->conversations, $assigneeType ?? $this->params['assignee_type'] ?? null, $this->currentUser);

        return $this->conversations;
    }

    /**
     * Tab Của tôi / Chưa gán / Đã gán của danh sách; tab khác (Tất cả) không lọc.
     *
     * @param  Builder<Conversation>  $conversations
     */
    public static function applyAssigneeTab(Builder $conversations, mixed $assigneeType, User $user): void
    {
        match ($assigneeType) {
            'me' => $conversations->assignedTo($user),
            'unassigned' => $conversations->unassigned(),
            'assigned' => $conversations->assigned(),
            default => $conversations,
        };
    }

    private function setUp(): void
    {
        $this->applyListFilters();
        self::filterBySearchQuery($this->conversations, $this->currentUser, $this->currentAccount, $this->params['q'] ?? null);
    }

    private function applyListFilters(): void
    {
        $this->findAllConversations();
        $this->filterByConversationType();
        $this->filterByStatus();
        $this->filterByTeam();
        $this->filterByLabels();
        $this->filterBySourceId();
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
        self::applyAssigneeTab($this->conversations, $this->params['assignee_type'] ?? null, $this->currentUser);
    }

    /** @return array<string, int> */
    private function tabCounts(): array
    {
        $accountId = $this->currentAccount->id;
        $filterParams = array_intersect_key($this->params, array_flip(self::TAB_COUNTS_FILTER_PARAMS));
        ksort($filterParams);
        $cacheKey = implode(':', [
            'conversation-tab-counts',
            $accountId,
            Cache::get(self::tabCountsVersionKey($accountId), '0'),
            $this->currentUser->id,
            md5((string) json_encode($filterParams)),
        ]);

        return Cache::remember($cacheKey, self::TAB_COUNTS_TTL_SECONDS, function (): array {
            $counts = $this->conversations->clone()
                ->selectRaw('COUNT(*) FILTER (WHERE assignee_id = ?) AS mine_count', [$this->currentUser->id])
                ->selectRaw('COUNT(*) FILTER (WHERE assignee_id IS NULL AND assignee_agent_bot_id IS NULL) AS unassigned_count')
                ->selectRaw('COUNT(*) AS all_count')
                ->toBase()
                ->first();

            return [
                'mine_count' => (int) $counts->mine_count,
                'assigned_count' => (int) $counts->all_count - (int) $counts->unassigned_count,
                'unassigned_count' => (int) $counts->unassigned_count,
                'all_count' => (int) $counts->all_count,
            ];
        });
    }

    private static function tabCountsVersionKey(int $accountId): string
    {
        return "conversation-tab-counts-version:{$accountId}";
    }

    /** @return array{0: string, 1: string, 2: string|null} */
    private function sortOption(): array
    {
        return self::SORT_OPTIONS[$this->params['sort_by'] ?? null] ?? self::SORT_OPTIONS[self::DEFAULT_SORT];
    }

    /**
     * Con trỏ = (giá trị cột sort, id) của dòng cuối trang trước, mã base64url.
     *
     * @return array{0: string|null, 1: int}|null
     */
    private function requestedCursor(): ?array
    {
        $token = $this->params['cursor'] ?? null;

        if ($token === null || $token === '') {
            return null;
        }

        $decoded = is_string($token)
            ? json_decode((string) base64_decode(strtr($token, '-_', '+/'), true), true)
            : null;

        $isValid = $this->sortOption()[2] !== null
            && is_array($decoded)
            && array_is_list($decoded)
            && count($decoded) === 2
            && ($decoded[0] === null || (is_string($decoded[0]) && preg_match(self::CURSOR_TIMESTAMP_PATTERN, $decoded[0]) === 1))
            && is_int($decoded[1]);

        if (! $isValid) {
            throw ValidationException::withMessages(['cursor' => __('validation.in', ['attribute' => 'cursor'])]);
        }

        return $decoded;
    }

    private static function encodeCursor(Conversation $conversation, string $column): string
    {
        $payload = (string) json_encode([$conversation->getRawOriginal($column), $conversation->id]);

        return rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    }

    /**
     * Dòng đứng sau con trỏ theo đúng thứ tự (cột, id) của Postgres: DESC đặt NULL
     * lên đầu, ASC đặt NULL xuống cuối. So sánh bộ đôi để index ghép dùng được.
     *
     * @param  Builder<Conversation>  $query
     * @param  array{0: string|null, 1: int}  $cursor
     */
    private static function afterCursor(Builder $query, string $column, string $direction, array $cursor): void
    {
        [$value, $id] = $cursor;
        $qualifiedColumn = "conversations.{$column}";
        $comparison = $direction === 'desc' ? '<' : '>';

        $query->where(function (Builder $after) use ($value, $id, $qualifiedColumn, $comparison, $direction) {
            if ($value === null) {
                $after->where(fn (Builder $tie) => $tie->whereNull($qualifiedColumn)->where('conversations.id', $comparison, $id));

                if ($direction === 'desc') {
                    $after->orWhereNotNull($qualifiedColumn);
                }

                return;
            }

            $after->whereRaw("({$qualifiedColumn}, conversations.id) {$comparison} (?, ?)", [$value, $id]);

            if ($direction === 'asc') {
                $after->orWhereNull($qualifiedColumn);
            }
        });
    }

    /**
     * @param  array{0: string|null, 1: int}|null  $cursor
     * @return array{0: Collection<int, Conversation>, 1: string|null}
     */
    private function fetchConversations(?array $cursor): array
    {
        [$sortScope, $sortDirection, $cursorColumn] = $this->sortOption();

        // id chốt thứ tự các dòng trùng giá trị sort, để page và cursor cùng một thứ tự.
        $query = $this->conversations
            ->with(['inbox', 'assignee.avatar', 'assigneeAgentBot', 'contact.avatar', 'team', 'contactInbox'])
            ->{$sortScope}($sortDirection)
            ->orderBy('conversations.id', $sortDirection);

        // updated_within (giây): FE realtime đồng bộ lại sau khi mất kết nối —
        // trả hết trong khoảng thời gian, không phân trang (filter_by_updated_at).
        if (filled($this->params['updated_within'] ?? null)) {
            return [
                $query->where('conversations.updated_at', '>', now()->subSeconds((int) $this->params['updated_within']))->get(),
                null,
            ];
        }

        $page = max(1, (int) ($this->params['page'] ?? 1));
        [$pinnedConversations, $query] = $this->separatePinned($query, $cursor === null && $page === 1);

        if ($cursor !== null) {
            self::afterCursor($query, $cursorColumn, $sortDirection, $cursor);
        } else {
            $query->offset(($page - 1) * self::RESULTS_PER_PAGE);
        }

        $conversations = $query->limit(self::RESULTS_PER_PAGE + 1)->get();
        $hasMore = $conversations->count() > self::RESULTS_PER_PAGE;
        $conversations = $conversations->take(self::RESULTS_PER_PAGE)->values();

        $nextCursor = $hasMore && $cursorColumn !== null
            ? self::encodeCursor($conversations->last(), $cursorColumn)
            : null;

        return [$pinnedConversations->concat($conversations)->values(), $nextCursor];
    }

    /**
     * Hội thoại người xem đã ghim đứng đầu danh sách: trang đầu trả trọn nhóm ghim
     * khớp bộ lọc, còn phần phân trang (page lẫn cursor) chỉ đi trên hội thoại chưa
     * ghim, nên con trỏ không bao giờ trỏ vào nhóm ghim.
     *
     * @param  Builder<Conversation>  $query
     * @return array{0: Collection<int, Conversation>, 1: Builder<Conversation>}
     */
    private function separatePinned(Builder $query, bool $isFirstPage): array
    {
        $pinnedIds = ConversationPin::conversationIdsPinnedBy($this->currentUser, $this->currentAccount->id);

        if ($pinnedIds === []) {
            return [new EloquentCollection, $query];
        }

        $pinnedConversations = $isFirstPage
            ? $query->clone()->whereIn('conversations.id', $pinnedIds)->get()
            : new EloquentCollection;

        return [$pinnedConversations, $query->whereNotIn('conversations.id', $pinnedIds)];
    }
}
