<?php

namespace App\Search;

use App\Models\Conversation;
use Illuminate\Database\Eloquent\Builder;

/**
 * Engine tìm kiếm chỉ trả lời "những id nào khớp, theo thứ tự nào". Quyền xem và
 * dữ liệu trả ra do SearchService quyết bằng cách nạp lại từ PostgreSQL, nên một
 * engine sai hay chậm đồng bộ cũng không làm lộ bản ghi.
 */
interface SearchEngine
{
    public function search(SearchQuery $query): SearchHits;

    /**
     * Tập id hội thoại khớp từ khoá theo thông tin hội thoại hoặc nội dung tin,
     * không xếp hạng, không phân trang — để lọc tại chỗ một danh sách hội thoại.
     * Engine cùng CSDL trả truy vấn con một cột id; engine ngoài trả mảng id.
     *
     * @return Builder<Conversation>|list<int>
     */
    public function matchingConversationIds(SearchQuery $query): Builder|array;
}
