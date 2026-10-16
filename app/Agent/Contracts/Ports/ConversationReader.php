<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\CoreMessage;

interface ConversationReader
{
    // null khi hội thoại không tồn tại trong account đó.
    public function conversation(ConversationRef $conversation): ?ConversationSnapshot;

    /**
     * Tin lõi theo thứ tự hội thoại, gồm cả ghi chú riêng và dòng hoạt động.
     * $afterMessageId null = $limit tin gần nhất (bootstrap).
     *
     * @return list<CoreMessage>
     */
    public function messagesAfter(ConversationRef $conversation, ?int $afterMessageId, int $limit): array;

    /**
     * Trong các sản phẩm này (id từ ProductCatalog), những cái thẻ đã được gửi trong hội
     * thoại (bởi AI hay nhân viên).
     *
     * @param  list<string>  $productIds
     * @return list<string>
     */
    public function shownProducts(ConversationRef $conversation, array $productIds): array;

    /**
     * Số tài khoản nhận tiền (chỉ chữ số) AI phải gửi bằng thẻ chuyển khoản chứ không gõ ra
     * chữ: tài khoản shop mở cho AI, khi kênh hiển thị được thẻ và hội thoại chưa có thẻ
     * chuyển khoản nào. Rỗng = không có gì phải chặn.
     *
     * @return list<string>
     */
    public function paymentNumbersRequiringCard(ConversationRef $conversation): array;

    /** @return list<string> tên các nhãn của account, theo thứ tự hiển thị */
    public function labels(int $accountId): array;
}
