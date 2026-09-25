<?php

namespace App\Support\Widget;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Channel\WebWidget;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Http\Request;

// Điểm dựng contact + contact_inbox DUY NHẤT của widget khi khách có hành động
// thật đầu tiên (gửi tin, mở hội thoại, gắn định danh, tương tác campaign).
// /config chỉ cấp source_id "treo" (không ghi DB) — dựng ở đây dùng lại ĐÚNG
// source_id đó nên an toàn khi đua nhau: unique(inbox_id, source_id) +
// ContactInboxWithContactBuilder tự tìm lại bản ghi vừa được luồng khác tạo.
final class LazyWidgetContactResolver
{
    /** @param array<string, mixed> $payload */
    public function resolve(WebWidget $channel, array $payload, Request $request): ?ContactInbox
    {
        $sourceId = $payload['source_id'] ?? null;

        if (blank($sourceId)) {
            return null;
        }

        $inbox = $channel->inbox;

        return (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: ['additional_attributes' => $this->additionalAttributes($request, $inbox)],
            sourceId: (string) $sourceId,
        ))->perform();
    }

    /** @return array<string, mixed> */
    private function additionalAttributes(Request $request, Inbox $inbox): array
    {
        return $inbox->account->featureEnabled('ip_lookup')
            ? ['created_at_ip' => $request->ip()]
            : [];
    }
}
