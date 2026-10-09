<?php

namespace App\Services\Conversations;

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\SearchService;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Ô tìm trong cột danh sách hội thoại, chia hai mục trong đúng phạm vi danh sách
 * đang xem (quyền, hộp thư, tab, trạng thái, nhãn, bộ lọc — bên gọi dựng sẵn):
 * - Liên hệ: mỗi khách khớp từ khoá một dòng, mang hội thoại gần nhất của khách
 *   trong phạm vi; trùng khít → đầu chuỗi/đầu từ → một phần, hoà thì hoạt động
 *   gần nhất trước. Chỉ ở trang đầu, có trần.
 * - Hội thoại: hội thoại có tin khớp, kèm tin khớp mới nhất (`matched_message_id`),
 *   xếp theo tin khớp mới nhất, phân trang. Gõ đúng mã hội thoại ("#12") thì hội
 *   thoại đó đứng đầu trang đầu.
 * Engine tìm kiếm quyết "khớp hay không"; lớp này chỉ giao với phạm vi và xếp.
 */
final class ListSearchService
{
    public const CONTACT_LIMIT = 20;

    public const CONVERSATIONS_PER_PAGE = ConversationFinder::RESULTS_PER_PAGE;

    public const MATCHED_MESSAGE_ID = 'matched_message_id';

    private const DISPLAY_ID_PATTERN = '/\A#?(\d{1,9})\z/';

    private readonly SearchTerm $term;

    private readonly SearchService $search;

    /** @param  Builder<Conversation>  $listScope */
    public function __construct(
        User $user,
        Account $account,
        private readonly Builder $listScope,
        string $keyword,
        private readonly int $page = 1,
    ) {
        $this->term = new SearchTerm($keyword);
        $this->search = new SearchService($user, $account, ['q' => $this->term->raw()], 'Conversation');
    }

    /**
     * @return array{
     *     contacts: Collection<int, Conversation>,
     *     conversations: Collection<int, Conversation>,
     *     matched_messages: Collection<int, Message>,
     *     has_more: bool,
     * }
     */
    public function perform(): array
    {
        if ($this->term->raw() === '') {
            return ['contacts' => new Collection, 'conversations' => new Collection, 'matched_messages' => new Collection, 'has_more' => false];
        }

        $isFirstPage = $this->page <= 1;
        [$conversations, $hasMore] = $this->messageMatches();
        $displayIdMatch = $isFirstPage ? $this->displayIdMatch() : null;

        if ($displayIdMatch !== null) {
            $conversations = (new Collection([$displayIdMatch]))->concat($conversations);
        }

        return [
            'contacts' => $isFirstPage ? $this->contactMatches() : new Collection,
            'conversations' => $conversations->values(),
            'matched_messages' => $this->matchedMessages($conversations),
            'has_more' => $hasMore,
        ];
    }

    /** @return Collection<int, Conversation> */
    private function contactMatches(): Collection
    {
        $latestPerContact = $this->listScope->clone()
            ->whereIn('conversations.id', $this->search->conversationIdsMatchingContact())
            ->reorder()
            ->selectRaw('DISTINCT ON (conversations.contact_id) conversations.id')
            ->orderBy('conversations.contact_id')
            ->orderByRaw('conversations.last_activity_at DESC NULLS LAST')
            ->orderByDesc('conversations.id');

        $query = Conversation::query()
            ->select('conversations.*')
            ->join('contacts', 'contacts.id', '=', 'conversations.contact_id')
            ->whereIn('conversations.id', $latestPerContact);

        $rank = $this->term->leadingMatchRank(['contacts.name'], ['contacts.email', 'contacts.phone_number', 'contacts.identifier']);

        if ($rank !== null) {
            $query->orderByRaw(...$rank);
        }

        return $query
            ->orderByRaw('conversations.last_activity_at DESC NULLS LAST')
            ->orderByDesc('conversations.id')
            ->limit(self::CONTACT_LIMIT)
            ->get();
    }

    /** @return array{0: Collection<int, Conversation>, 1: bool} */
    private function messageMatches(): array
    {
        $matched = $this->search->latestMatchedMessages()
            ->select('messages.conversation_id', 'messages.id as '.self::MATCHED_MESSAGE_ID, 'messages.created_at as matched_at');

        $query = $this->listScope->clone()
            ->joinSub($matched, 'matched', 'matched.conversation_id', '=', 'conversations.id')
            ->select('conversations.*', 'matched.'.self::MATCHED_MESSAGE_ID)
            ->reorder()
            ->orderByDesc('matched.matched_at')
            ->orderByDesc('matched.'.self::MATCHED_MESSAGE_ID);

        $displayId = $this->requestedDisplayId();

        if ($displayId !== null) {
            $query->where('conversations.display_id', '!=', $displayId);
        }

        $rows = $query
            ->offset((max(1, $this->page) - 1) * self::CONVERSATIONS_PER_PAGE)
            ->limit(self::CONVERSATIONS_PER_PAGE + 1)
            ->get();

        return [$rows->take(self::CONVERSATIONS_PER_PAGE)->values(), $rows->count() > self::CONVERSATIONS_PER_PAGE];
    }

    private function displayIdMatch(): ?Conversation
    {
        $displayId = $this->requestedDisplayId();

        return $displayId === null
            ? null
            : $this->listScope->clone()->where('conversations.display_id', $displayId)->first();
    }

    private function requestedDisplayId(): ?int
    {
        return preg_match(self::DISPLAY_ID_PATTERN, $this->term->raw(), $matches) === 1 ? (int) $matches[1] : null;
    }

    /**
     * Tin khớp của cả trang trong một truy vấn, mang sẵn cha (hội thoại, account,
     * hộp thư) để dựng payload không tra lại.
     *
     * @param  Collection<int, Conversation>  $conversations
     * @return Collection<int, Message>
     */
    private function matchedMessages(Collection $conversations): Collection
    {
        $conversationsByMessageId = $conversations
            ->filter(fn (Conversation $conversation) => $conversation->getAttribute(self::MATCHED_MESSAGE_ID) !== null)
            ->keyBy(fn (Conversation $conversation) => (int) $conversation->getAttribute(self::MATCHED_MESSAGE_ID));

        if ($conversationsByMessageId->isEmpty()) {
            return new Collection;
        }

        return Message::query()
            ->whereKey($conversationsByMessageId->keys()->all())
            ->with(['attachments', 'sender'])
            ->get()
            ->each(fn (Message $message) => $message->setRelation('conversation', $conversationsByMessageId[$message->id]))
            ->keyBy('id');
    }
}
