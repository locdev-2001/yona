<?php

namespace App\Search\Drivers;

use App\Search\ConfiguresIndexSettings;
use App\Search\Drivers\Meilisearch\MeilisearchDocuments;
use App\Search\SearchEngine;
use App\Search\SearchHits;
use App\Search\SearchQuery;
use App\Search\SearchTarget;
use Meilisearch\Client;
use Meilisearch\Contracts\DocumentsQuery;
use Meilisearch\Endpoints\Indexes;

/**
 * Tìm tương đối trên chỉ mục Meilisearch riêng cho từng loại tài liệu. Cấu hình
 * giữ mặc định (khớp tiền tố, matchingStrategy last, typo) — chỉ thêm
 * created_at:desc cuối rankingRules để thời gian phá hoà. Tìm bằng key chỉ đọc,
 * ghi và cấu hình bằng master key; không key nào ra khỏi backend.
 */
final class MeilisearchEngine implements ConfiguresIndexSettings, SearchEngine
{
    // Trần số hội thoại khớp theo nội dung tin khi lọc tại chỗ một danh sách.
    public const MATCHING_CONVERSATION_LIMIT = 1000;

    private const DEFAULT_TASK_TIMEOUT_MS = 30_000;

    private const RECENCY_RANKING_RULE = 'created_at:desc';

    private ?Client $adminClient = null;

    private ?Client $searchClient = null;

    public function search(SearchQuery $query): SearchHits
    {
        if ($query->inboxIds === []) {
            return SearchHits::none();
        }

        $parameters = [
            'filter' => $this->scopeFilters($query, $query->target),
            'offset' => max(0, ($query->page - 1) * $query->perPage),
            'limit' => $query->perPage,
            'attributesToRetrieve' => ['id'],
        ];

        // Trong một hội thoại, tin khớp đọc lại theo thời gian như cuộc trò chuyện.
        if ($query->target->isMessageBound() && $query->conversationId !== null) {
            $parameters['sort'] = [self::RECENCY_RANKING_RULE];
        }

        $result = $this->searchIndex($query->target)->rawSearch($query->keyword, $parameters);

        return new SearchHits(
            ids: array_map(fn (array $hit) => (int) $hit['id'], $result['hits']),
            estimatedTotal: $result['estimatedTotalHits'] ?? null,
        );
    }

    public function matchingConversationIds(SearchQuery $query): array
    {
        if ($query->inboxIds === []) {
            return [];
        }

        $byConversation = $this->searchIndex(SearchTarget::Conversations)->rawSearch($query->keyword, [
            'filter' => $this->scopeFilters($query, SearchTarget::Conversations),
            'limit' => self::MATCHING_CONVERSATION_LIMIT,
            'attributesToRetrieve' => ['id'],
        ]);

        $byMessage = $this->searchIndex(SearchTarget::Messages)->rawSearch($query->keyword, [
            'filter' => $this->scopeFilters($query, SearchTarget::Messages),
            'limit' => self::MATCHING_CONVERSATION_LIMIT,
            'distinct' => 'conversation_id',
            'attributesToRetrieve' => ['conversation_id'],
        ]);

        return array_values(array_unique([
            ...array_map(fn (array $hit) => (int) $hit['id'], $byConversation['hits']),
            ...array_map(fn (array $hit) => (int) $hit['conversation_id'], $byMessage['hits']),
        ]));
    }

    public function keepsSeparateIndex(): bool
    {
        return true;
    }

    public function index(SearchTarget $target, array $ids): void
    {
        if ($ids === []) {
            return;
        }

        $documents = MeilisearchDocuments::load($target, $ids);

        if ($documents !== []) {
            $this->adminIndex($target)->addDocuments($documents, 'id');
        }

        $vanished = array_values(array_diff($ids, array_column($documents, 'id')));

        if ($vanished !== []) {
            $this->remove($target, $vanished);
        }

        if ($target === SearchTarget::Contacts && $documents !== []) {
            $this->indexContactConversations(array_column($documents, 'id'));
        }
    }

    public function remove(SearchTarget $target, array $ids): void
    {
        if ($ids === []) {
            return;
        }

        $this->adminIndex($target)->deleteDocuments(array_values($ids));

        match ($target) {
            SearchTarget::Messages => $this->deleteWhereIn(SearchTarget::Files, 'message_id', $ids),
            SearchTarget::Conversations => $this->removeConversationChildren($ids),
            SearchTarget::Contacts => $this->removeContactConversations($ids),
            SearchTarget::Files => null,
        };
    }

    public function syncIndexSettings(): void
    {
        $client = $this->adminClient();

        foreach (SearchTarget::cases() as $target) {
            $index = $client->index($this->indexName($target));
            $client->waitForTask($client->createIndex($this->indexName($target), ['primaryKey' => 'id'])['taskUid'], self::DEFAULT_TASK_TIMEOUT_MS);

            // rankingRules mặc định của phiên bản đang chạy, rồi thêm thời gian phá hoà.
            $client->waitForTask($index->resetRankingRules()['taskUid'], self::DEFAULT_TASK_TIMEOUT_MS);
            $defaultRules = array_values(array_diff($index->getRankingRules(), [self::RECENCY_RANKING_RULE]));

            $client->waitForTask($index->updateSettings([
                'searchableAttributes' => MeilisearchDocuments::searchableAttributes($target),
                'filterableAttributes' => MeilisearchDocuments::filterableAttributes($target),
                'sortableAttributes' => ['created_at'],
                'rankingRules' => [...$defaultRules, self::RECENCY_RANKING_RULE],
                'prefixSearch' => 'indexingTime',
            ])['taskUid'], self::DEFAULT_TASK_TIMEOUT_MS);
        }
    }

    public function indexName(SearchTarget $target): string
    {
        return config('search.meilisearch.index_prefix').$target->value;
    }

    /**
     * Phạm vi bắt buộc của mọi lượt tìm — nơi DUY NHẤT gắn account và hộp thư,
     * cùng mốc nhìn lại, hội thoại, người gửi và khoảng thời gian.
     *
     * @return list<string>
     */
    private function scopeFilters(SearchQuery $query, SearchTarget $index): array
    {
        $filters = ['account_id = '.$query->accountId];

        if ($index !== SearchTarget::Contacts && $query->inboxIds !== null) {
            $filters[] = 'inbox_id IN ['.$this->integerList($query->inboxIds).']';
        }

        if ($index->isMessageBound()) {
            $filters[] = 'created_at >= '.$query->lookbackStart->getTimestamp();

            if ($query->conversationId !== null) {
                $filters[] = 'conversation_id = '.$query->conversationId;
            }

            if ($query->senderType !== null && $query->senderId !== null) {
                $filters[] = 'sender_type = '.json_encode($query->senderType, JSON_UNESCAPED_UNICODE);
                $filters[] = 'sender_id = '.$query->senderId;
            }
        }

        if ($index === SearchTarget::Contacts) {
            $filters[] = $query->leadContactsOnly ? 'is_lead = true' : 'is_resolved = true';
        }

        $timeField = $index->isMessageBound() ? 'created_at' : 'last_activity_at';

        if ($query->since !== null) {
            $filters[] = "{$timeField} >= ".$query->since->getTimestamp();
        }

        if ($query->until !== null) {
            $filters[] = "{$timeField} <= ".$query->until->getTimestamp();
        }

        return $filters;
    }

    /**
     * Tài liệu hội thoại mang tên, email, SĐT của khách: sửa liên hệ thì đồng bộ lại
     * các hội thoại của liên hệ đó.
     *
     * @param  list<int>  $contactIds
     */
    private function indexContactConversations(array $contactIds): void
    {
        SearchTarget::Conversations->documents()
            ->whereIn('conversations.contact_id', $contactIds)
            ->select('conversations.id')
            ->toBase()
            ->chunkById(
                self::MATCHING_CONVERSATION_LIMIT,
                fn ($rows) => $this->index(SearchTarget::Conversations, $rows->map(fn (object $row) => (int) $row->id)->all()),
                'conversations.id',
                'id',
            );
    }

    /** @param  list<int>  $conversationIds */
    private function removeConversationChildren(array $conversationIds): void
    {
        $this->deleteWhereIn(SearchTarget::Messages, 'conversation_id', $conversationIds);
        $this->deleteWhereIn(SearchTarget::Files, 'conversation_id', $conversationIds);
    }

    /**
     * Xoá liên hệ thì CSDL xoá dây chuyền hội thoại. Chỉ gỡ hội thoại đã thật sự
     * mất khỏi PostgreSQL: hội thoại vừa gộp sang liên hệ khác có thể chưa kịp
     * cập nhật contact_id trong chỉ mục.
     *
     * @param  list<int>  $contactIds
     */
    private function removeContactConversations(array $contactIds): void
    {
        $indexedConversationIds = array_map(
            fn (array $document) => (int) $document['id'],
            $this->adminIndex(SearchTarget::Conversations)->getDocuments(
                (new DocumentsQuery)
                    ->setFilter(['contact_id IN ['.$this->integerList($contactIds).']'])
                    ->setFields(['id'])
                    ->setLimit(self::MATCHING_CONVERSATION_LIMIT),
            )->getResults(),
        );

        $deletedConversationIds = array_values(array_diff(
            $indexedConversationIds,
            MeilisearchDocuments::existingIds(SearchTarget::Conversations, $indexedConversationIds),
        ));

        $this->remove(SearchTarget::Conversations, $deletedConversationIds);
    }

    /** @param  list<int>  $ids */
    private function deleteWhereIn(SearchTarget $target, string $field, array $ids): void
    {
        $this->adminIndex($target)->deleteDocuments(['filter' => "{$field} IN [".$this->integerList($ids).']']);
    }

    /** @param  list<int>  $ids */
    private function integerList(array $ids): string
    {
        return implode(',', array_map('intval', $ids));
    }

    private function adminIndex(SearchTarget $target): Indexes
    {
        return $this->adminClient()->index($this->indexName($target));
    }

    private function searchIndex(SearchTarget $target): Indexes
    {
        return $this->searchClient()->index($this->indexName($target));
    }

    private function adminClient(): Client
    {
        return $this->adminClient ??= new Client(config('search.meilisearch.host'), config('search.meilisearch.key'));
    }

    private function searchClient(): Client
    {
        $searchKey = config('search.meilisearch.search_key')
            ?? throw new \RuntimeException('Thiếu MEILISEARCH_SEARCH_KEY (key chỉ có quyền search) — xem docs/deployment.md.');

        return $this->searchClient ??= new Client(config('search.meilisearch.host'), $searchKey);
    }
}
