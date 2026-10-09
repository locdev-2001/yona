<?php

namespace App\Search\Drivers;

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Search\SearchEngine;
use App\Search\SearchHits;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Tìm ngay trong PostgreSQL. Chữ người đọc (tên, nội dung, tiêu đề thư, tên tệp)
// khớp không dấu qua SearchTerm; email, số điện thoại, mã khớp nguyên văn. Mỗi loại
// xếp theo mức liên quan của chữ người đọc (SearchTerm::orderByRelevance) rồi mới
// tới mới hơn trước, id cuối cùng để các trang không chồng nhau. Không đếm tổng.
final class PostgresSearchEngine implements SearchEngine
{
    // Người gửi thật của tin nhóm (khoá chuẩn của năng lực group_threads). Kênh
    // không có tin nhóm thì khoá này vắng, không bao giờ khớp.
    public const GROUP_SENDER_NAME_SQL = "messages.content_attributes #>> '{sender,name}'";

    private const MAIL_SUBJECT_SQL = "conversations.additional_attributes ->> 'mail_subject'";

    /** @var array<string, SearchTerm> */
    private array $termsByKeyword = [];

    public function search(SearchQuery $query): SearchHits
    {
        return match ($query->target) {
            SearchTarget::Conversations => $this->conversationHits($query),
            SearchTarget::Messages => $this->idHits($this->messageMatches($query), 'messages.id', $query),
            SearchTarget::Contacts => $this->idHits($this->contactMatches($query), 'contacts.id', $query),
            SearchTarget::Files => $this->idHits($this->fileMatches($query), 'attachments.id', $query),
        };
    }

    /** @return Builder<Conversation> */
    public function matchingConversationIds(SearchQuery $query): Builder
    {
        $term = $this->term($query);

        return $this->conversations($query)
            ->select('conversations.id')
            ->where(fn (Builder $matches) => $this->whereConversationMatches($matches, $term)
                ->orWhereExists($this->messages($query)
                    ->whereColumn('messages.conversation_id', 'conversations.id')
                    ->whereRaw(...$term->foldedMatch('messages.content'))));
    }

    /** @return Builder<Conversation> */
    public function conversationIdsMatchingContact(SearchQuery $query): Builder
    {
        $term = $this->term($query);

        return $this->conversations($query)
            ->select('conversations.id')
            ->where(fn (Builder $matches) => $this->whereContactMatches($matches, $term));
    }

    /** @return Builder<Message> */
    public function latestMatchedMessageIds(SearchQuery $query): Builder
    {
        return $this->messages($query)
            ->whereRaw(...$this->term($query)->foldedMatch('messages.content'))
            ->selectRaw('DISTINCT ON (messages.conversation_id) messages.id')
            ->orderBy('messages.conversation_id')
            ->orderByDesc('messages.created_at')
            ->orderByDesc('messages.id');
    }

    // Chỉ mục chính là các bảng — không có gì để đồng bộ.
    public function keepsSeparateIndex(): bool
    {
        return false;
    }

    public function index(SearchTarget $target, array $ids): void {}

    public function remove(SearchTarget $target, array $ids): void {}

    private function conversationHits(SearchQuery $query): SearchHits
    {
        $term = $this->term($query);

        $matches = $this->conversations($query)
            ->select('conversations.id')
            // Tên thành viên nhóm khớp gần nhất — cho giao diện biết vì sao nhóm này ra.
            ->selectSub(
                $this->groupMemberMatch($term)
                    ->selectRaw(self::GROUP_SENDER_NAME_SQL)
                    ->reorder()
                    ->orderByDesc('messages.created_at')
                    ->limit(1),
                SearchHits::MATCHED_MEMBER_NAME,
            )
            // Bọc ngoặc: nếu không, OR nuốt luôn điều kiện account_id/inbox_id.
            ->where(fn (Builder $conditions) => $this->whereConversationMatches($conditions, $term));

        $rows = $term->orderByRelevance($this->applyTimeFilter($matches, $query, 'conversations.last_activity_at'), 'contacts.name', self::MAIL_SUBJECT_SQL)
            ->orderByDesc('conversations.created_at')
            ->orderByDesc('conversations.id')
            ->forPage($query->page, $query->perPage)
            ->toBase()
            ->get();

        return new SearchHits(
            ids: $rows->map(fn (object $row) => (int) $row->id)->all(),
            annotations: $rows->mapWithKeys(fn (object $row) => [
                (int) $row->id => [SearchHits::MATCHED_MEMBER_NAME => $row->{SearchHits::MATCHED_MEMBER_NAME}],
            ])->all(),
        );
    }

    // Trong một hội thoại, tin khớp xếp theo thời gian (mới trước) như đọc lại
    // cuộc trò chuyện; tìm chung thì theo mức liên quan trước.
    /** @return Builder<Message> */
    private function messageMatches(SearchQuery $query): Builder
    {
        $term = $this->term($query);
        $matches = $this->messages($query)->whereRaw(...$term->foldedMatch('messages.content'));

        if ($query->conversationId === null) {
            $matches = $term->orderByRelevance($matches, 'messages.content');
        }

        // created_at đơn lẻ không duy nhất — thiếu id làm tie-break thì các trang
        // liền nhau đảo chỗ và trùng bản ghi.
        return $matches->orderByDesc('messages.created_at')->orderByDesc('messages.id');
    }

    // Mỗi tệp khớp là một kết quả (một tin ba tệp khớp ra ba dòng). Phạm vi và bộ
    // lọc đi theo đúng tin chứa tệp.
    /** @return Builder<Attachment> */
    private function fileMatches(SearchQuery $query): Builder
    {
        $term = $this->term($query);

        $matches = Attachment::query()
            ->searchDocuments()
            ->whereIn('attachments.attachable_id', $this->messages($query)->select('messages.id'))
            ->whereRaw(...$term->foldedMatch(Attachment::DISPLAY_NAME_SQL));

        return $term->orderByRelevance($matches, Attachment::DISPLAY_NAME_SQL)
            ->orderByDesc('attachments.created_at')
            ->orderByDesc('attachments.id');
    }

    /** @return Builder<Contact> */
    private function contactMatches(SearchQuery $query): Builder
    {
        $term = $this->term($query);

        $matches = Contact::query()
            ->where('contacts.account_id', $query->accountId)
            ->where(fn (Builder $conditions) => $conditions
                ->whereRaw(...$term->foldedMatch('contacts.name'))
                ->orWhereRaw(...$term->plainMatch('contacts.email'))
                ->orWhereRaw(...$term->plainMatch('contacts.phone_number'))
                ->orWhereRaw(...$term->plainMatch('contacts.identifier')));

        return $term->orderByRelevance($this->applyTimeFilter($matches, $query, 'contacts.last_activity_at'), 'contacts.name')
            ->listableContacts($query->leadContactsOnly)
            ->orderOnLastActivityAt('desc')
            ->orderByDesc('contacts.id');
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $ranked
     */
    private function idHits(Builder $ranked, string $idColumn, SearchQuery $query): SearchHits
    {
        return new SearchHits($ranked->forPage($query->page, $query->perPage)
            ->pluck($idColumn)
            ->map(fn (mixed $id) => (int) $id)
            ->all());
    }

    // Tin trong phạm vi của lượt tìm: account, mốc nhìn lại, hộp thư, hội thoại,
    // người gửi và khoảng thời gian — chưa lọc theo từ khoá.
    /** @return Builder<Message> */
    private function messages(SearchQuery $query): Builder
    {
        $messages = Message::query()
            ->where('messages.account_id', $query->accountId)
            ->where('messages.created_at', '>=', $query->lookbackStart);

        if ($query->inboxIds !== null) {
            $messages->whereIn('messages.inbox_id', $query->inboxIds);
        }

        if ($query->conversationId !== null) {
            $messages->where('messages.conversation_id', $query->conversationId);
        }

        if ($query->senderType !== null && $query->senderId !== null) {
            $messages->where('messages.sender_type', $query->senderType)->where('messages.sender_id', $query->senderId);
        }

        if ($query->conversationMessagesOnly) {
            $messages->where('messages.message_type', '!=', Message::TYPE_ACTIVITY);
        }

        return $this->applyTimeFilter($messages, $query, 'messages.created_at');
    }

    // Hội thoại của account trong các hộp thư được tìm, đã nối contacts để luật
    // khớp đọc được thông tin khách.
    /** @return Builder<Conversation> */
    private function conversations(SearchQuery $query): Builder
    {
        $conversations = Conversation::query()->where('conversations.account_id', $query->accountId);

        if ($query->inboxIds !== null) {
            $conversations->whereIn('conversations.inbox_id', $query->inboxIds);
        }

        return $conversations->join('contacts', 'conversations.contact_id', '=', 'contacts.id');
    }

    // Luật khớp của một hội thoại (truy vấn đã nối contacts): mã, tên/email/SĐT/mã
    // định danh của khách, tiêu đề thư, người gửi thật trong nhóm.
    /**
     * @param  Builder<Conversation>  $matches
     * @return Builder<Conversation>
     */
    private function whereConversationMatches(Builder $matches, SearchTerm $term): Builder
    {
        return $matches
            ->whereRaw(...$term->withoutIdPrefix()->plainMatch('cast(conversations.display_id as text)'))
            ->orWhere(fn (Builder $contact) => $this->whereContactMatches($contact, $term))
            ->orWhereRaw(...$term->foldedMatch(self::MAIL_SUBJECT_SQL))
            ->orWhereExists($this->groupMemberMatch($term));
    }

    // Khách của hội thoại (truy vấn đã nối contacts) khớp tên, email, SĐT, mã định danh.
    /**
     * @param  Builder<Conversation>  $matches
     * @return Builder<Conversation>
     */
    private function whereContactMatches(Builder $matches, SearchTerm $term): Builder
    {
        return $matches
            ->whereRaw(...$term->foldedMatch('contacts.name'))
            ->orWhereRaw(...$term->plainMatch('contacts.email'))
            ->orWhereRaw(...$term->plainMatch('contacts.phone_number'))
            ->orWhereRaw(...$term->plainMatch('contacts.identifier'));
    }

    // Tin trong nhóm của hội thoại đang xét mà người gửi thật khớp từ khoá.
    /** @return Builder<Message> */
    private function groupMemberMatch(SearchTerm $term): Builder
    {
        return Message::query()
            ->whereColumn('messages.conversation_id', 'conversations.id')
            ->whereRaw(...$term->foldedMatch(self::GROUP_SENDER_NAME_SQL));
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function applyTimeFilter(Builder $query, SearchQuery $search, string $column): Builder
    {
        if ($search->since !== null) {
            $query->where($column, '>=', $search->since);
        }

        if ($search->until !== null) {
            $query->where($column, '<=', $search->until);
        }

        return $query;
    }

    // Fold từ khoá tốn một truy vấn — dùng lại cho mọi loại của cùng lượt tìm.
    private function term(SearchQuery $query): SearchTerm
    {
        return $this->termsByKeyword[$query->keyword] ??= new SearchTerm($query->keyword);
    }
}
