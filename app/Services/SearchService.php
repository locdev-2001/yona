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
// số điện thoại, mã khớp nguyên văn. Mỗi loại xếp theo mức liên quan của chữ người
// đọc (SearchTerm::orderByRelevance) rồi mới tới mới hơn trước, id cuối cùng để
// các trang không chồng nhau. Articles: trả rỗng tới khi có Help Center.
class SearchService
{
    public const RESULTS_PER_PAGE = 15;

    // Mốc until của bộ lọc nâng cao không vượt quá bấy nhiêu ngày tới.
    public const TIME_RANGE_LIMIT_DAYS = 90;

    // Tìm kiếm chỉ nhìn lại 12 tháng — tin nhắn, tệp và mốc since của bộ lọc nâng
    // cao dùng chung một mốc: đủ để tra lại báo giá, chuyển khoản cũ mà vẫn giữ
    // truy vấn gọn.
    public const MESSAGE_LOOKBACK_MONTHS = 12;

    // Người gửi thật của tin nhóm (khoá chuẩn của năng lực group_threads). Kênh
    // không có tin nhóm thì khoá này vắng, không bao giờ khớp.
    public const GROUP_SENDER_NAME_SQL = "messages.content_attributes #>> '{sender,name}'";

    private const MAIL_SUBJECT_SQL = "conversations.additional_attributes ->> 'mail_subject'";

    // Thanh tìm trong một hội thoại đếm và nhảy qua từng tin khớp: đủ id cho hội
    // thoại dài mà không kéo cả bản ghi.
    public const CONVERSATION_MATCH_LIMIT = 1000;

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
        $query = $this->accessibleConversations()
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
            // Bọc ngoặc: nếu không, OR nuốt luôn điều kiện account_id/inbox_id.
            ->where(fn (Builder $matches) => $this->whereConversationMatches($matches));

        if ($this->advancedSearchEnabled()) {
            $query = $this->applyTimeFilter($query, 'conversations.last_activity_at');
        }

        return $this->searchTerm()->orderByRelevance($query, 'contacts.name', self::MAIL_SUBJECT_SQL)
            ->with(['contact', 'inbox', 'assignee.accountUsers'])
            ->orderByDesc('conversations.created_at')
            ->orderByDesc('conversations.id')
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
    }

    /**
     * Id hội thoại khớp từ khoá cho ô tìm lọc tại chỗ trong danh sách hội thoại:
     * cùng luật khớp của filterConversations, cộng hội thoại có tin khớp nội dung
     * (cùng luật và mốc nhìn lại của filterMessages). Chỉ trả tập id — bên gọi giữ
     * nguyên hộp thư, tab, trạng thái, bộ lọc và thứ tự của danh sách đang xem.
     *
     * @return Builder<Conversation>
     */
    public function matchingConversationIds(): Builder
    {
        $term = $this->searchTerm();

        return $this->accessibleConversations()
            ->select('conversations.id')
            ->where(fn (Builder $matches) => $this->whereConversationMatches($matches)
                ->orWhereExists($this->messageBaseQuery()
                    ->whereColumn('messages.conversation_id', 'conversations.id')
                    ->whereRaw(...$term->foldedMatch('messages.content'))));
    }

    // Trong một hội thoại, tin khớp xếp theo thời gian (mới trước) như đọc lại
    // cuộc trò chuyện; tìm chung thì theo mức liên quan trước.
    /** @return Collection<int, Message> */
    public function filterMessages(): Collection
    {
        $query = $this->matchedMessages();

        if (! $this->scopedToConversation()) {
            $query = $this->searchTerm()->orderByRelevance($query, 'messages.content');
        }

        return $this->newestFirst($query)
            ->with(self::MESSAGE_RESULT_RELATIONS)
            ->forPage($this->currentPage(), self::RESULTS_PER_PAGE)
            ->get();
    }

    /** @return list<int> */
    public function matchedMessageIds(): array
    {
        return $this->newestFirst($this->matchedMessages())
            ->limit(self::CONVERSATION_MATCH_LIMIT)
            ->pluck('messages.id')
            ->all();
    }

    // Mỗi tệp khớp là một kết quả (một tin ba tệp khớp ra ba dòng). Phạm vi, quyền
    // và bộ lọc nâng cao đi theo đúng tin chứa tệp.
    /** @return Collection<int, Attachment> */
    public function filterFiles(): Collection
    {
        $term = $this->searchTerm();

        $query = Attachment::query()
            ->select('attachments.*')
            ->whereMorphedTo('attachable', Message::class)
            ->whereIn('attachments.attachable_id', $this->filteredMessages()->select('messages.id'))
            ->whereIn('attachments.file_type', Attachment::SEARCHABLE_FILE_TYPES)
            ->whereRaw(...$term->foldedMatch(Attachment::DISPLAY_NAME_SQL));

        return $term->orderByRelevance($query, Attachment::DISPLAY_NAME_SQL)
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

        return $term->orderByRelevance($query, 'contacts.name')
            ->resolvedContacts($this->currentAccount->featureEnabled('crm_v2'))
            ->orderOnLastActivityAt('desc')
            ->orderByDesc('contacts.id')
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
        return $this->applyConversationFilter($this->applyMessageFilters($this->messageBaseQuery()));
    }

    /** @return Builder<Message> */
    private function matchedMessages(): Builder
    {
        return $this->filteredMessages()->whereRaw(...$this->searchTerm()->foldedMatch('messages.content'));
    }

    // created_at đơn lẻ không duy nhất — thiếu id làm tie-break thì các trang liền
    // nhau đảo chỗ và trùng bản ghi.
    /**
     * @param  Builder<Message>  $query
     * @return Builder<Message>
     */
    private function newestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('messages.created_at')->orderByDesc('messages.id');
    }

    private function scopedToConversation(): bool
    {
        return $this->conversationDisplayId() !== null;
    }

    private function conversationDisplayId(): ?int
    {
        $displayId = $this->params['conversation_id'] ?? null;

        return is_numeric($displayId) && (int) $displayId > 0 ? (int) $displayId : null;
    }

    // Chỉ thu hẹp phạm vi: tin vẫn phải qua lớp quyền theo hộp thư của
    // messageBaseQuery, nên hội thoại ở hộp thư không được phép ra rỗng.
    /**
     * @param  Builder<Message>  $query
     * @return Builder<Message>
     */
    private function applyConversationFilter(Builder $query): Builder
    {
        $displayId = $this->conversationDisplayId();

        if ($displayId === null) {
            return $query;
        }

        return $query->whereIn('messages.conversation_id', Conversation::query()
            ->select('conversations.id')
            ->where('conversations.account_id', $this->currentAccount->id)
            ->where('conversations.display_id', $displayId));
    }

    // Hội thoại của account trong các hộp thư người tìm được xem, đã nối contacts
    // để luật khớp đọc được thông tin khách.
    /** @return Builder<Conversation> */
    private function accessibleConversations(): Builder
    {
        return Conversation::query()
            ->where('conversations.account_id', $this->currentAccount->id)
            ->whereIn('conversations.inbox_id', $this->accessableInboxIds())
            ->join('contacts', 'conversations.contact_id', '=', 'contacts.id');
    }

    // Luật khớp của một hội thoại (truy vấn đã nối contacts): mã, tên/email/SĐT/mã
    // định danh của khách, tiêu đề thư, người gửi thật trong nhóm.
    /**
     * @param  Builder<Conversation>  $matches
     * @return Builder<Conversation>
     */
    private function whereConversationMatches(Builder $matches): Builder
    {
        $term = $this->searchTerm();

        return $matches
            ->whereRaw(...$term->withoutIdPrefix()->plainMatch('cast(conversations.display_id as text)'))
            ->orWhereRaw(...$term->foldedMatch('contacts.name'))
            ->orWhereRaw(...$term->plainMatch('contacts.email'))
            ->orWhereRaw(...$term->plainMatch('contacts.phone_number'))
            ->orWhereRaw(...$term->plainMatch('contacts.identifier'))
            ->orWhereRaw(...$term->foldedMatch(self::MAIL_SUBJECT_SQL))
            ->orWhereExists($this->groupMemberMatch());
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

    // Yêu cầu xa hơn mốc tìm kiếm bị kẹp im lặng về mốc đó, không báo lỗi.
    private function capSinceTime(mixed $since): Carbon
    {
        $requested = Carbon::createFromTimestamp((int) $since);
        $maxLookback = Carbon::now()->subMonths(self::MESSAGE_LOOKBACK_MONTHS);

        return $requested->greaterThan($maxLookback) ? $requested : $maxLookback;
    }

    private function capUntilTime(mixed $until): Carbon
    {
        $requested = Carbon::createFromTimestamp((int) $until);
        $maxFuture = Carbon::now()->addDays(self::TIME_RANGE_LIMIT_DAYS);

        return $requested->lessThan($maxFuture) ? $requested : $maxFuture;
    }
}
