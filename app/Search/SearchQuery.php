<?php

namespace App\Search;

use Carbon\CarbonInterface;

/**
 * Một lượt tìm gửi xuống engine: phạm vi đã được SearchService quyết sẵn, engine
 * chỉ áp đúng những gì có ở đây. Trường null nghĩa là không lọc theo trường đó.
 */
final readonly class SearchQuery
{
    /**
     * @param  list<int>|null  $inboxIds  hộp thư được tìm; null = mọi hộp thư của account
     * @param  int|null  $conversationId  chỉ tin và tệp của một hội thoại, xếp theo thời gian thay vì mức liên quan
     * @param  CarbonInterface  $lookbackStart  tin và tệp cũ hơn mốc này không được tìm
     * @param  bool  $leadContactsOnly  liên hệ chỉ tính loại lead (account bật crm_v2); tắt thì tính mọi liên hệ
     * @param  bool  $conversationMessagesOnly  tin chỉ tính tin trò chuyện (khách, nhân viên, ghi chú), bỏ tin hoạt động hệ thống
     */
    public function __construct(
        public SearchTarget $target,
        public int $accountId,
        public string $keyword,
        public CarbonInterface $lookbackStart,
        public int $page = 1,
        public int $perPage = 15,
        public ?array $inboxIds = null,
        public ?int $conversationId = null,
        public ?string $senderType = null,
        public ?int $senderId = null,
        public ?CarbonInterface $since = null,
        public ?CarbonInterface $until = null,
        public bool $leadContactsOnly = false,
        public bool $conversationMessagesOnly = false,
    ) {}
}
