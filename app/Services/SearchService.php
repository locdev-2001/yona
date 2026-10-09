<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Search\SearchEngine;
use App\Search\SearchHits;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

// Tìm hội thoại, tin nhắn, liên hệ và tệp của một account theo từ khoá. Engine
// (config/search.php) chỉ trả id đã xếp hạng; lớp này là chỗ duy nhất quyết phạm
// vi và quyền: dựng SearchQuery với hộp thư người tìm được xem, rồi nạp lại theo
// id từ PostgreSQL dưới đúng điều kiện account + hộp thư đó, giữ thứ tự của engine
// và bỏ id không còn hoặc không được xem. Trang có thể ngắn hơn khi engine trả id
// đã mất quyền — không bù bằng truy vấn thêm. Articles: trả rỗng tới khi có Help
// Center.
class SearchService
{
    public const RESULTS_PER_PAGE = 15;

    // Mốc until của bộ lọc nâng cao không vượt quá bấy nhiêu ngày tới.
    public const TIME_RANGE_LIMIT_DAYS = 90;

    // Tìm kiếm chỉ nhìn lại 12 tháng — tin nhắn, tệp và mốc since của bộ lọc nâng
    // cao dùng chung một mốc: đủ để tra lại báo giá, chuyển khoản cũ mà vẫn giữ
    // truy vấn gọn.
    public const MESSAGE_LOOKBACK_MONTHS = 12;

    // Thanh tìm trong một hội thoại đếm và nhảy qua từng tin khớp: đủ id cho hội
    // thoại dài mà không kéo cả bản ghi.
    public const CONVERSATION_MATCH_LIMIT = 1000;

    // Quan hệ MessageResource đọc tới — dùng chung cho tab Tin nhắn và tin của tab Tệp.
    private const MESSAGE_RESULT_RELATIONS = ['conversation.contactInbox', 'sender', 'attachments', 'account', 'inbox'];

    /** @var array<int>|null */
    private ?array $accessableInboxIds = null;

    private ?AccountUser $accountUser = null;

    private ?SearchEngine $engine = null;

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
        $hits = $this->hits($this->searchQuery(SearchTarget::Conversations));
        $conversations = $this->reload(SearchTarget::Conversations, $hits, ['contact', 'inbox', 'assignee.accountUsers']);

        // Ghi như cột đã đọc từ DB (không bẩn) — chỉ để hiển thị, không bao giờ lưu.
        foreach ($conversations as $conversation) {
            $conversation->setRawAttributes([
                ...$conversation->getAttributes(),
                SearchHits::MATCHED_MEMBER_NAME => $hits->annotation($conversation->id, SearchHits::MATCHED_MEMBER_NAME),
            ], sync: true);
        }

        return $conversations;
    }

    /**
     * Id hội thoại khớp từ khoá cho ô tìm lọc tại chỗ trong danh sách hội thoại:
     * khớp thông tin hội thoại hoặc nội dung tin (cùng mốc nhìn lại của tab Tin
     * nhắn). Chỉ trả tập id — bên gọi giữ nguyên hộp thư, tab, trạng thái, bộ lọc
     * và thứ tự của danh sách đang xem.
     *
     * @return Builder<Conversation>
     */
    public function matchingConversationIds(): Builder
    {
        return $this->permitted(SearchTarget::Conversations)
            ->select('conversations.id')
            ->whereIn('conversations.id', $this->engine()->matchingConversationIds($this->searchQuery(SearchTarget::Conversations)));
    }

    /**
     * Id hội thoại có khách khớp từ khoá (tên, email, SĐT, mã định danh), trong
     * hộp thư người tìm được xem — mục "Liên hệ" của ô tìm trong danh sách.
     *
     * @return Builder<Conversation>
     */
    public function conversationIdsMatchingContact(): Builder
    {
        return $this->permitted(SearchTarget::Conversations)
            ->select('conversations.id')
            ->whereIn('conversations.id', $this->engine()->conversationIdsMatchingContact($this->searchQuery(SearchTarget::Conversations)));
    }

    /**
     * Tin trò chuyện khớp từ khoá mới nhất của từng hội thoại (bỏ tin hoạt động hệ
     * thống), trong phạm vi tin người tìm được xem — mục "Hội thoại" của ô tìm
     * trong danh sách.
     *
     * @return Builder<Message>
     */
    public function latestMatchedMessages(): Builder
    {
        return $this->permittedMessages()
            ->where('messages.message_type', '!=', Message::TYPE_ACTIVITY)
            ->whereIn('messages.id', $this->engine()->latestMatchedMessageIds($this->searchQuery(SearchTarget::Messages, conversationMessagesOnly: true)));
    }

    /** @return Collection<int, Message> */
    public function filterMessages(): Collection
    {
        return $this->reload(SearchTarget::Messages, $this->hits($this->searchQuery(SearchTarget::Messages)), self::MESSAGE_RESULT_RELATIONS);
    }

    /** @return list<int> */
    public function matchedMessageIds(): array
    {
        $hits = $this->hits($this->searchQuery(SearchTarget::Messages, page: 1, perPage: self::CONVERSATION_MATCH_LIMIT));
        $permittedIds = array_flip($this->permitted(SearchTarget::Messages)
            ->whereKey($hits->ids)
            ->pluck('messages.id')
            ->all());

        return array_values(array_filter($hits->ids, fn (int $id) => isset($permittedIds[$id])));
    }

    /** @return Collection<int, Attachment> */
    public function filterFiles(): Collection
    {
        return $this->reload(SearchTarget::Files, $this->hits($this->searchQuery(SearchTarget::Files)), [
            'attachable' => fn (MorphTo $morph) => $morph->morphWith([Message::class => self::MESSAGE_RESULT_RELATIONS]),
        ]);
    }

    /** @return Collection<int, Contact> */
    public function filterContacts(): Collection
    {
        return $this->reload(SearchTarget::Contacts, $this->hits($this->searchQuery(SearchTarget::Contacts)), []);
    }

    // Help Center chưa port (E4) — giữ khoá `articles` để shape payload không đổi.
    /** @return array<int, mixed> */
    public function filterArticles(): array
    {
        return [];
    }

    /**
     * Phạm vi một lượt tìm gửi xuống engine. Hộp thư: hội thoại luôn theo hộp thư
     * người tìm được xem; tin và tệp bỏ lọc hộp thư khi người tìm xem được mọi hộp
     * thư, bộ lọc nâng cao thu hẹp về đúng một hộp thư được phép.
     */
    public function searchQuery(
        SearchTarget $target,
        ?int $page = null,
        int $perPage = self::RESULTS_PER_PAGE,
        bool $conversationMessagesOnly = false,
    ): SearchQuery {
        $advanced = $this->advancedSearchEnabled();
        $messageBound = $target->isMessageBound();
        [$senderType, $senderId] = $advanced && $messageBound ? $this->parseFromParam($this->params['from'] ?? null) : [null, null];

        return new SearchQuery(
            target: $target,
            accountId: $this->currentAccount->id,
            keyword: SearchTerm::fromParams($this->params)->raw(),
            lookbackStart: $this->lookbackStart(),
            page: $page ?? $this->currentPage(),
            perPage: $perPage,
            inboxIds: $messageBound ? $this->messageInboxFilter($advanced) : $this->accessableInboxIds(),
            conversationId: $messageBound ? $this->scopedConversationId() : null,
            senderType: $senderType,
            senderId: $senderId,
            since: $advanced ? $this->capSinceTime($this->params['since'] ?? null) : null,
            until: $advanced ? $this->capUntilTime($this->params['until'] ?? null) : null,
            leadContactsOnly: $this->currentAccount->featureEnabled('crm_v2'),
            conversationMessagesOnly: $conversationMessagesOnly,
        );
    }

    private function hits(SearchQuery $query): SearchHits
    {
        // Hỏi một hội thoại không có trong account: không có gì để tìm.
        if ($query->target->isMessageBound() && $query->conversationId === null && $this->conversationDisplayId() !== null) {
            return SearchHits::none();
        }

        return $this->engine()->search($query);
    }

    /**
     * Nạp lại bản ghi theo id engine trả, dưới đúng điều kiện quyền, giữ thứ tự
     * engine; id không còn hoặc không được xem thì rơi ra.
     *
     * @param  array<array-key, mixed>  $relations
     * @return Collection<int, Model>
     */
    private function reload(SearchTarget $target, SearchHits $hits, array $relations): Collection
    {
        if ($hits->ids === []) {
            return new Collection;
        }

        $positions = array_flip($hits->ids);

        return $this->permitted($target)
            ->whereKey($hits->ids)
            ->with($relations)
            ->get()
            ->sortBy(fn (Model $model) => $positions[$model->getKey()])
            ->values();
    }

    /**
     * Điều kiện quyền duy nhất của tìm kiếm: bản ghi thuộc account và (với hội
     * thoại, tin, tệp) nằm trong hộp thư người tìm được xem.
     *
     * @return Builder<Model>
     */
    private function permitted(SearchTarget $target): Builder
    {
        return match ($target) {
            SearchTarget::Conversations => Conversation::query()
                ->where('conversations.account_id', $this->currentAccount->id)
                ->whereIn('conversations.inbox_id', $this->accessableInboxIds()),
            SearchTarget::Messages => $this->permittedMessages(),
            SearchTarget::Contacts => Contact::query()->where('contacts.account_id', $this->currentAccount->id),
            SearchTarget::Files => Attachment::query()
                ->whereMorphedTo('attachable', Message::class)
                ->whereIn('attachments.attachable_id', $this->permittedMessages()->select('messages.id'))
                ->excludingStickers(),
        };
    }

    /** @return Builder<Message> */
    private function permittedMessages(): Builder
    {
        $messages = Message::query()->where('messages.account_id', $this->currentAccount->id);

        if (! $this->shouldSkipInboxFiltering()) {
            $messages->whereIn('messages.inbox_id', $this->accessableInboxIds());
        }

        return $messages;
    }

    /** @return list<int>|null */
    private function messageInboxFilter(bool $advanced): ?array
    {
        $inboxId = $advanced ? (int) ($this->params['inbox_id'] ?? 0) : 0;

        if ($inboxId !== 0 && $this->validateInboxAccess($inboxId)) {
            return [$inboxId];
        }

        return $this->shouldSkipInboxFiltering() ? null : array_values($this->accessableInboxIds());
    }

    private function engine(): SearchEngine
    {
        return $this->engine ??= app(SearchEngine::class);
    }

    /** @return array<int, int> */
    private function accessableInboxIds(): array
    {
        return $this->accessableInboxIds ??= $this->currentUser
            ->assignedInboxes($this->currentAccount, $this->accountUser())
            ->pluck('inboxes.id')
            ->all();
    }

    private function conversationDisplayId(): ?int
    {
        $displayId = $this->params['conversation_id'] ?? null;

        return is_numeric($displayId) && (int) $displayId > 0 ? (int) $displayId : null;
    }

    // Chỉ thu hẹp phạm vi: tin vẫn phải qua lớp quyền theo hộp thư, nên hội thoại
    // ở hộp thư không được phép ra rỗng.
    private function scopedConversationId(): ?int
    {
        $displayId = $this->conversationDisplayId();

        if ($displayId === null) {
            return null;
        }

        $conversationId = Conversation::query()
            ->where('conversations.account_id', $this->currentAccount->id)
            ->where('conversations.display_id', $displayId)
            ->value('conversations.id');

        return $conversationId === null ? null : (int) $conversationId;
    }

    private function currentPage(): int
    {
        return max(1, (int) ($this->params['page'] ?? 1));
    }

    private function advancedSearchEnabled(): bool
    {
        return $this->currentAccount->featureEnabled('advanced_search');
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

    private function lookbackStart(): Carbon
    {
        return Carbon::now()->subMonths(self::MESSAGE_LOOKBACK_MONTHS);
    }

    // Yêu cầu xa hơn mốc tìm kiếm bị kẹp im lặng về mốc đó, không báo lỗi.
    private function capSinceTime(mixed $since): ?Carbon
    {
        if ($since === null || $since === '') {
            return null;
        }

        $requested = Carbon::createFromTimestamp((int) $since);
        $maxLookback = $this->lookbackStart();

        return $requested->greaterThan($maxLookback) ? $requested : $maxLookback;
    }

    private function capUntilTime(mixed $until): ?Carbon
    {
        if ($until === null || $until === '') {
            return null;
        }

        $requested = Carbon::createFromTimestamp((int) $until);
        $maxFuture = Carbon::now()->addDays(self::TIME_RANGE_LIMIT_DAYS);

        return $requested->lessThan($maxFuture) ? $requested : $maxFuture;
    }
}
