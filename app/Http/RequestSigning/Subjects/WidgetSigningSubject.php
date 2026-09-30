<?php

namespace App\Http\RequestSigning\Subjects;

use App\Http\Middleware\ResolveWidgetChannel;
use App\Support\WidgetTokenService;
use Illuminate\Http\Request;

// Khách website nhận diện bằng JWT phiên khách (source_id + inbox_id do máy chủ ký). Đọc thẳng
// từ token để giới hạn nhịp dùng được cả khi chạy trước ResolveWidgetChannel (throttle nằm
// trong danh sách ưu tiên middleware của framework nên luôn bị xếp lên sớm).
final class WidgetSigningSubject implements SigningSubject
{
    public function exempt(Request $request): bool
    {
        return false;
    }

    public function identify(Request $request): ?string
    {
        $payload = $this->tokenPayload($request);

        if (blank($payload['source_id'] ?? null) || blank($payload['inbox_id'] ?? null)) {
            return null;
        }

        return 'widget:'.$payload['inbox_id'].':'.$payload['source_id'];
    }

    public function inboxId(Request $request): ?string
    {
        $inboxId = $this->tokenPayload($request)['inbox_id'] ?? null;

        return blank($inboxId) ? null : (string) $inboxId;
    }

    /** @return array<string, mixed> */
    private function tokenPayload(Request $request): array
    {
        return $request->attributes->get(ResolveWidgetChannel::AUTH_PAYLOAD)
            ?? WidgetTokenService::decode($request->header('X-Auth-Token'));
    }
}
