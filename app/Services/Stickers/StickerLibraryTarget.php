<?php

namespace App\Services\Stickers;

use App\Models\Account;
use Illuminate\Http\Request;

// Kho mà một lời gọi bằng token sticker được chạm: kho riêng của một account
// hoặc kho nền tảng (owner null). Middleware xác thực token gắn vào request;
// MCP tool và REST chỉ đọc từ đây, không tự quyết kho.
final readonly class StickerLibraryTarget
{
    public const REQUEST_ATTRIBUTE = 'stickerLibraryTarget';

    private const PLATFORM_RATE_LIMIT_KEY = 'platform-library';

    public function __construct(
        public ?Account $owner,
    ) {}

    // Cùng khoá với limiter tải lên của trang cài đặt: một kho một nhịp, dù gọi
    // từ dashboard hay bằng token.
    public function rateLimitKey(): string
    {
        return $this->owner === null ? self::PLATFORM_RATE_LIMIT_KEY : 'account:'.$this->owner->id;
    }

    public static function fromRequest(Request $request): ?self
    {
        $target = $request->attributes->get(self::REQUEST_ATTRIBUTE);

        return $target instanceof self ? $target : null;
    }

    public function attachTo(Request $request): void
    {
        $request->attributes->set(self::REQUEST_ATTRIBUTE, $this);
    }
}
