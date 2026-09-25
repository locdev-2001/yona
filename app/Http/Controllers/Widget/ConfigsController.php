<?php

namespace App\Http\Controllers\Widget;

use App\Http\Resources\Widget\WidgetConfigResource;
use App\Support\WidgetTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Cửa vào của mọi phiên khách — KHÔNG ghi DB: token hợp lệ thì dùng lại đúng
// phiên cũ, token thiếu/hỏng thì chỉ cấp một source_id "treo". Contact +
// contact_inbox chỉ dựng khi khách có hành động thật đầu tiên, ở
// ResolveOrCreateWidgetContact.
class ConfigsController extends WidgetController
{
    public function store(Request $request): JsonResponse
    {
        $channel = $this->channel($request);
        $contactInbox = $this->contactInbox($request);

        $token = WidgetTokenService::generate([
            'source_id' => $contactInbox?->source_id ?? $this->pendingSourceId($request, $channel->inbox->id),
            'inbox_id' => $channel->inbox->id,
        ]);

        return response()->json(WidgetConfigResource::make($channel, $contactInbox, $token));
    }

    // Giữ nguyên source_id đã cấp trong request (nếu có) để tải lại nhiều lần
    // không đổi định danh phiên; source_id của một inbox khác (đổi widget cùng
    // trình duyệt) hoặc token hỏng/thiếu thì cấp UUID mới.
    private function pendingSourceId(Request $request, int $inboxId): string
    {
        $payload = $this->authPayload($request);
        $existing = $payload['source_id'] ?? null;

        if (! is_string($existing) || $existing === '' || ($payload['inbox_id'] ?? null) !== $inboxId) {
            return (string) Str::uuid();
        }

        return $existing;
    }
}
