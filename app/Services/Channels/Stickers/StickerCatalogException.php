<?php

namespace App\Services\Channels\Stickers;

use RuntimeException;

/**
 * Lỗi của danh mục sticker: `code()` là mã ổn định cho client rẽ nhánh, message
 * là câu đã dịch để hiện thẳng cho agent.
 */
final class StickerCatalogException extends RuntimeException
{
    public const CAPABILITY_NOT_SUPPORTED = 'capability_not_supported';

    public const NOT_FOUND = 'not_found';

    public function __construct(private readonly string $stableCode, string $message)
    {
        parent::__construct($message);
    }

    public static function notSupported(?string $locale): self
    {
        return new self(self::CAPABILITY_NOT_SUPPORTED, __('errors.stickers.capability_not_supported', [], $locale));
    }

    public static function notFound(?string $locale): self
    {
        return new self(self::NOT_FOUND, __('errors.stickers.not_found', [], $locale));
    }

    public function code(): string
    {
        return $this->stableCode;
    }
}
