<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

// Port từ app/services/search_service.rb.
// Bỏ nhánh Elasticsearch/Searchkick (advanced_search + OPENSEARCH_URL, chỉ
// chạy trên bản enterprise) — còn lại đúng hai đường GIN và ILIKE của CE.
// Articles: trả rỗng tới khi có Help Center (E4).
class SearchService
{
    public const RESULTS_PER_PAGE = 15;

    // Limits::MESSAGE_SEARCH_TIME_RANGE_LIMIT_DAYS.
    public const TIME_RANGE_LIMIT_DAYS = 90;

    // message_base_query: chỉ tìm trong 3 tháng gần nhất.
    private const MESSAGE_LOOKBACK_MONTHS = 3;

    /** @var array<int>|null */
    private ?array $accessableInboxIds = null;

    private ?AccountUser $accountUser = null;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly User $currentUser,
        private readonly Account $currentAccount,
        private readonly array $params,
        private readonly string $searchType,
    ) {}

    /** @return array<string, iterable<mixed>> */
    public function perform(): array
    {
        return match ($this->searchType) {
            'Message' => ['messages' => $this->filterMessages()],
            'Conversation' => ['conversations' => $this->filterConversations()],
            'Contact' => ['contacts' => $this->filterContacts()],
            'Article' => ['articles' => $this->filterArticles()],
            default => [
                'contacts' => $this->filterContacts(),
                'messages' => $this->filterMessages(),
                'conversations' => $this->filterConversations(),
                'articles' => $this->filterArticles(),
            ],
        };
    }

    public function accountUser(): AccountUser
    {
        return $this->accountUser ??= $this->currentAccount->accountUsers()
            ->where('user_id', $this->currentUser->id)
            ->firstOrFail();
    }

    /** @return Collection<int, Conversation> */
    public function filterConversations(): Collection
    {
        $query = Conversation::query()
            ->select('conversations.*')
            ->where('conversations.account_id', $this->currentAccount->id)
            ->whereIn('conversations.inbox_id', $this->accessableInboxIds())
            ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
            // Rails bọc whereRaw trong ngoặc; Laravel thì không — phải tự bọc,
            // nếu không OR sẽ nuốt luôn điều kiện account_id/inbox_id.
            ->whereRaw(
                '(cast(conversations.display_id as text) ILIKE ? OR contacts.name ILIKE ?'
                .' OR contacts.email ILIKE ? OR contacts.phone_number ILIKE ?'
                .' OR contacts.identifier ILIKE ?)',
                array_fill(0, 5, $this->likePattern()),
            );

        if ($this->advancedSearchEnabled()) {
            $query = $this->applyTimeFilter($query, 'conversations.last_activity_at');
        }

        return $query->with(['contact', 'inbox', 'assignee.accountUsers'])
            ->orderByDesc('conversations.created_at')
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
    }

    /** @return Collection<int, Message> */
    public function filterMessages(): Collection
    {
        return $this->useGinSearch() ? $this->filterMessagesWithGin() : $this->filterMessagesWithLike();
    }

    /** @return Collection<int, Message> */
    public function filterMessagesWithGin(): Collection
    {
        $query = $this->applyMessageFilters($this->messageBaseQuery());

        if ($this->searchQuery() !== '') {
            // Toán tử @@ + to_tsquery để dùng được index GIN; nối các từ bằng
            // <-> nên khớp cả cụm theo đúng thứ tự (giống bản gốc).
            $query->whereRaw('content @@ to_tsquery(?)', [implode(' <-> ', preg_split('/\s+/', $this->searchQuery()) ?: [])]);
        }

        return $this->orderedMessagePage($query);
    }

    /** @return Collection<int, Message> */
    public function filterMessagesWithLike(): Collection
    {
        $query = $this->applyMessageFilters($this->messageBaseQuery())
            ->whereRaw('messages.content ILIKE ?', [$this->likePattern()]);

        return $this->orderedMessagePage($query);
    }

    /** @return Builder<Message> */
    public function messageBaseQuery(): Builder
    {
        $query = Message::query()
            ->where('messages.account_id', $this->currentAccount->id)
            ->where('messages.created_at', '>=', Carbon::now()->subMonths(self::MESSAGE_LOOKBACK_MONTHS));

        if (! $this->shouldSkipInboxFiltering()) {
            $query->whereIn('messages.inbox_id', $this->accessableInboxIds());
        }

        return $query;
    }

    /** @return Collection<int, Contact> */
    public function filterContacts(): Collection
    {
        $query = Contact::query()
            ->where('contacts.account_id', $this->currentAccount->id)
            ->whereRaw(
                '(contacts.name ILIKE ? OR contacts.email ILIKE ?'
                .' OR contacts.phone_number ILIKE ? OR contacts.identifier ILIKE ?)',
                array_fill(0, 4, $this->likePattern()),
            );

        if ($this->advancedSearchEnabled()) {
            $query = $this->applyTimeFilter($query, 'contacts.last_activity_at');
        }

        return $query->resolvedContacts($this->currentAccount->featureEnabled('crm_v2'))
            ->orderOnLastActivityAt('desc')
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
    }

    // Help Center chưa port (E4) — giữ khoá `articles` để shape payload không đổi.
    /** @return array<int, mixed> */
    public function filterArticles(): array
    {
        return [];
    }

    public function useGinSearch(): bool
    {
        return $this->currentAccount->featureEnabled('search_with_gin');
    }

    /** @return array<int, int> */
    private function accessableInboxIds(): array
    {
        return $this->accessableInboxIds ??= $this->currentUser
            ->assignedInboxes($this->currentAccount, $this->accountUser())
            ->pluck('inboxes.id')
            ->all();
    }

    private function searchQuery(): string
    {
        return trim((string) ($this->params['q'] ?? ''));
    }

    private function likePattern(): string
    {
        return '%'.$this->searchQuery().'%';
    }

    private function currentPage(): int
    {
        return max(1, (int) ($this->params['page'] ?? 1));
    }

    private function advancedSearchEnabled(): bool
    {
        return $this->currentAccount->featureEnabled('advanced_search');
    }

    /**
     * @param  Builder<Message>  $query
     * @return Collection<int, Message>
     */
    private function orderedMessagePage(Builder $query): Collection
    {
        // created_at đơn lẻ không duy nhất — thiếu id làm tie-break thì các
        // trang liền nhau đảo chỗ và trùng bản ghi.
        return $query->with(['conversation.contactInbox', 'sender', 'attachments', 'account', 'inbox'])
            ->reorder()
            ->orderByDesc('messages.created_at')
            ->orderByDesc('messages.id')
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
    }

    /**
     * @param  Builder<Message>  $query
     * @return Builder<Message>
     */
    private function applyMessageFilters(Builder $query): Builder
    {
        if (! $this->advancedSearchEnabled()) {
            return $query;
        }

        $query = $this->applyTimeFilter($query, 'messages.created_at');
        $query = $this->applySenderFilter($query);

        return $this->applyInboxIdFilter($query);
    }

    /**
     * @param  Builder<Message>  $query
     * @return Builder<Message>
     */
    private function applySenderFilter(Builder $query): Builder
    {
        [$senderType, $senderId] = $this->parseFromParam($this->params['from'] ?? null);

        if ($senderType === null || $senderId === null) {
            return $query;
        }

        return $query->where('messages.sender_type', $senderType)->where('messages.sender_id', $senderId);
    }

    /** @return array{0: ?string, 1: ?int} */
    private function parseFromParam(mixed $fromParam): array
    {
        if (! is_string($fromParam) || preg_match('/\A(contact|agent):\d+\z/', $fromParam) !== 1) {
            return [null, null];
        }

        [$type, $id] = explode(':', $fromParam);

        // sender_type lưu tên lớp Ruby ('User'/'Contact') qua morphMap.
        return [$type === 'agent' ? 'User' : 'Contact', (int) $id];
    }

    /**
     * @param  Builder<Message>  $query
     * @return Builder<Message>
     */
    private function applyInboxIdFilter(Builder $query): Builder
    {
        $inboxId = (int) ($this->params['inbox_id'] ?? 0);

        if ($inboxId === 0 || ! $this->validateInboxAccess($inboxId)) {
            return $query;
        }

        return $query->where('messages.inbox_id', $inboxId);
    }

    private function validateInboxAccess(int $inboxId): bool
    {
        return $this->shouldSkipInboxFiltering() || in_array($inboxId, $this->accessableInboxIds(), true);
    }

    private function shouldSkipInboxFiltering(): bool
    {
        return $this->accountUser()->isAdministrator() || $this->userHasAccessToAllInboxes();
    }

    private function userHasAccessToAllInboxes(): bool
    {
        $accessable = $this->accessableInboxIds();
        sort($accessable);
        $all = $this->currentAccount->inboxes()->pluck('inboxes.id')->all();
        sort($all);

        return $accessable === $all;
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function applyTimeFilter(Builder $query, string $column): Builder
    {
        $since = $this->params['since'] ?? null;
        $until = $this->params['until'] ?? null;

        if ($since === null && $until === null) {
            return $query;
        }

        if ($since !== null && $since !== '') {
            $query->where($column, '>=', $this->capSinceTime($since));
        }

        if ($until !== null && $until !== '') {
            $query->where($column, '<=', $this->capUntilTime($until));
        }

        return $query;
    }

    // Yêu cầu quá xa bị kẹp im lặng về mốc 90 ngày, không báo lỗi.
    private function capSinceTime(mixed $since): Carbon
    {
        $requested = Carbon::createFromTimestamp((int) $since);
        $maxLookback = Carbon::now()->subDays(self::TIME_RANGE_LIMIT_DAYS);

        return $requested->greaterThan($maxLookback) ? $requested : $maxLookback;
    }

    private function capUntilTime(mixed $until): Carbon
    {
        $requested = Carbon::createFromTimestamp((int) $until);
        $maxFuture = Carbon::now()->addDays(self::TIME_RANGE_LIMIT_DAYS);

        return $requested->lessThan($maxFuture) ? $requested : $maxFuture;
    }
}
