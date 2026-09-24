<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

// Tìm hội thoại, tin nhắn, liên hệ và tệp của một account theo từ khoá. Chữ người
// đọc (tên, nội dung, tiêu đề thư, tên tệp) khớp không dấu qua SearchTerm; email,
// số điện thoại, mã khớp nguyên văn. Articles: trả rỗng tới khi có Help Center.
class SearchService
{
    public const RESULTS_PER_PAGE = 15;

    // Giới hạn khoảng thời gian của bộ lọc nâng cao (since/until).
    public const TIME_RANGE_LIMIT_DAYS = 90;

    // Tin nhắn và tệp chỉ tìm trong 12 tháng gần nhất: đủ để tra lại báo giá,
    // chuyển khoản cũ mà vẫn giữ truy vấn gọn.
    public const MESSAGE_LOOKBACK_MONTHS = 12;

    // Người gửi thật của tin nhóm (khoá chuẩn của năng lực group_threads). Kênh
    // không có tin nhóm thì khoá này vắng, không bao giờ khớp.
    public const GROUP_SENDER_NAME_SQL = "messages.content_attributes #>> '{sender,name}'";

    private const MAIL_SUBJECT_SQL = "conversations.additional_attributes ->> 'mail_subject'";

    // Quan hệ MessageResource đọc tới — dùng chung cho tab Tin nhắn và tin của tab Tệp.
    private const MESSAGE_RESULT_RELATIONS = ['conversation.contactInbox', 'sender', 'attachments', 'account', 'inbox'];

    /** @var array<int>|null */
    private ?array $accessableInboxIds = null;

    private ?AccountUser $accountUser = null;

    private ?SearchTerm $searchTerm = null;

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
            'Attachment' => ['files' => $this->filterFiles()],
            'Article' => ['articles' => $this->filterArticles()],
            default => [
                'conversations' => $this->filterConversations(),
                'messages' => $this->filterMessages(),
                'contacts' => $this->filterContacts(),
                'files' => $this->filterFiles(),
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
        $term = $this->searchTerm();

        $query = Conversation::query()
            ->select('conversations.*')
            // Tên thành viên nhóm khớp gần nhất — cho giao diện biết vì sao nhóm này ra.
            ->selectSub(
                $this->groupMemberMatch()
                    ->selectRaw(self::GROUP_SENDER_NAME_SQL)
                    ->reorder()
                    ->orderByDesc('messages.created_at')
                    ->limit(1),
                'matched_member_name',
            )
            ->where('conversations.account_id', $this->currentAccount->id)
            ->whereIn('conversations.inbox_id', $this->accessableInboxIds())
            ->join('contacts', 'conversations.contact_id', '=', 'contacts.id')
            // Bọc ngoặc: nếu không, OR nuốt luôn điều kiện account_id/inbox_id.
            ->where(fn (Builder $matches) => $matches
                ->whereRaw(...$term->plainMatch('cast(conversations.display_id as text)'))
                ->orWhereRaw(...$term->foldedMatch('contacts.name'))
                ->orWhereRaw(...$term->plainMatch('contacts.email'))
                ->orWhereRaw(...$term->plainMatch('contacts.phone_number'))
                ->orWhereRaw(...$term->plainMatch('contacts.identifier'))
                ->orWhereRaw(...$term->foldedMatch(self::MAIL_SUBJECT_SQL))
                ->orWhereExists($this->groupMemberMatch()));

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
        return $this->orderedMessagePage(
            $this->filteredMessages()->whereRaw(...$this->searchTerm()->foldedMatch('messages.content')),
        );
    }

    // Mỗi tệp khớp là một kết quả (một tin ba tệp khớp ra ba dòng). Phạm vi, quyền
    // và bộ lọc nâng cao đi theo đúng tin chứa tệp.
    /** @return Collection<int, Attachment> */
    public function filterFiles(): Collection
    {
        return Attachment::query()
            ->select('attachments.*')
            ->whereMorphedTo('attachable', Message::class)
            ->whereIn('attachments.attachable_id', $this->filteredMessages()->select('messages.id'))
            ->whereIn('attachments.file_type', Attachment::SEARCHABLE_FILE_TYPES)
            ->whereRaw(...$this->searchTerm()->foldedMatch(Attachment::DISPLAY_NAME_SQL))
            ->with(['attachable' => fn (MorphTo $morph) => $morph->morphWith([
                Message::class => self::MESSAGE_RESULT_RELATIONS,
            ])])
            ->orderByDesc('attachments.created_at')
            ->orderByDesc('attachments.id')
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
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
        $term = $this->searchTerm();

        $query = Contact::query()
            ->where('contacts.account_id', $this->currentAccount->id)
            ->where(fn (Builder $matches) => $matches
                ->whereRaw(...$term->foldedMatch('contacts.name'))
                ->orWhereRaw(...$term->plainMatch('contacts.email'))
                ->orWhereRaw(...$term->plainMatch('contacts.phone_number'))
                ->orWhereRaw(...$term->plainMatch('contacts.identifier')));

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

    /** @return array<int, int> */
    private function accessableInboxIds(): array
    {
        return $this->accessableInboxIds ??= $this->currentUser
            ->assignedInboxes($this->currentAccount, $this->accountUser())
            ->pluck('inboxes.id')
            ->all();
    }

    private function searchTerm(): SearchTerm
    {
        return $this->searchTerm ??= SearchTerm::fromParams($this->params);
    }

    /** @return Builder<Message> */
    private function filteredMessages(): Builder
    {
        return $this->applyMessageFilters($this->messageBaseQuery());
    }

    // Tin trong nhóm của hội thoại đang xét mà người gửi thật khớp từ khoá.
    /** @return Builder<Message> */
    private function groupMemberMatch(): Builder
    {
        return Message::query()
            ->whereColumn('messages.conversation_id', 'conversations.id')
            ->whereRaw(...$this->searchTerm()->foldedMatch(self::GROUP_SENDER_NAME_SQL));
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
        return $query->with(self::MESSAGE_RESULT_RELATIONS)
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
