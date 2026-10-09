<?php

namespace App\Search;

use App\Models\Conversation;
use App\Models\Message;
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

    /**
     * Tập id hội thoại có khách khớp từ khoá theo tên, email, số điện thoại hoặc mã
     * định danh — mục "Liên hệ" của ô tìm trong danh sách hội thoại. Không xếp
     * hạng, không phân trang; cùng dạng trả về như matchingConversationIds.
     *
     * @return Builder<Conversation>|list<int>
     */
    public function conversationIdsMatchingContact(SearchQuery $query): Builder|array;

    /**
     * Id tin khớp từ khoá mới nhất của từng hội thoại có tin khớp — mục "Hội thoại"
     * của ô tìm trong danh sách hội thoại. Cùng phạm vi tin như search() với
     * target Messages. Engine cùng CSDL trả truy vấn con một cột id; engine ngoài
     * trả mảng id.
     *
     * @return Builder<Message>|list<int>
     */
    public function latestMatchedMessageIds(SearchQuery $query): Builder|array;

    /**
     * Engine giữ chỉ mục riêng ngoài PostgreSQL thì cần outbox đồng bộ; engine tìm
     * thẳng trong CSDL thì không, và khi đó không dòng outbox nào được ghi.
     */
    public function keepsSeparateIndex(): bool;

    /**
     * Đồng bộ các tài liệu theo trạng thái hiện tại trong PostgreSQL. Id không còn
     * tồn tại (hoặc không còn là tài liệu tìm kiếm) thì gỡ khỏi chỉ mục — nên thứ
     * tự xử lý các dòng outbox không làm chỉ mục sai.
     *
     * @param  list<int>  $ids
     */
    public function index(SearchTarget $target, array $ids): void;

    /**
     * Gỡ tài liệu đã xoá. Xoá một hội thoại hay liên hệ thì CSDL xoá dây chuyền tin
     * và tệp bên dưới qua khoá ngoại mà không bắn sự kiện model, nên engine phải
     * gỡ luôn các tài liệu con đó.
     *
     * @param  list<int>  $ids
     */
    public function remove(SearchTarget $target, array $ids): void;
}
