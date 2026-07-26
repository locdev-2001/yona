<?php

namespace App\Http\Support;

use App\Models\Attachment;
use App\Modules\Chat\Delivery\MediaUrlFactory;
use Illuminate\Support\Facades\URL;

/**
 * Cài đặt cổng URL bằng router — sống ở tầng biên vào vì `route()` là thứ của HTTP.
 */
class RoutedMediaUrlFactory implements MediaUrlFactory
{
    /**
     * Đủ dài cho nhà cung cấp tải xong, đủ ngắn để một địa chỉ rò ra ngoài
     * không thành một cái cửa mở.
     */
    private const SIGNED_FETCH_TTL_MINUTES = 15;

    public function signedFetchUrl(Attachment $attachment, string $workspaceId): string
    {
        return URL::temporarySignedRoute(
            'inbox.attachments.raw',
            now()->addMinutes(self::SIGNED_FETCH_TTL_MINUTES),
            [
                'attachmentKey' => $attachment->attachment_key,
                'ws' => $workspaceId,
            ],
        );
    }

    public function displayUrl(Attachment $attachment): string
    {
        return route('inbox.attachments.show', $attachment->attachment_key);
    }
}
