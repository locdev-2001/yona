<?php

namespace App\Services\Stickers;

use RuntimeException;

// Skill "tạo bộ sticker" cho trợ lý AI: một tệp SKILL.md duy nhất, vừa cho tải
// về cài vào thư mục skills, vừa phát qua prompt của MCP kho sticker.
final class StickerPackSkill
{
    // Trùng `name` trong frontmatter: cũng là tên thư mục khi cài vào thư mục skills.
    public const NAME = 'yona-sticker-pack';

    public const DOWNLOAD_NAME = 'SKILL.md';

    public const MIME_TYPE = 'text/markdown; charset=UTF-8';

    private const RELATIVE_PATH = 'resources/skills/'.self::NAME.'/SKILL.md';

    private const FRONTMATTER_PATTERN = '/\A---\R.*?\R---\R+/s';

    public static function path(): string
    {
        return base_path(self::RELATIVE_PATH);
    }

    public function document(): string
    {
        $document = @file_get_contents(self::path());

        return $document === false ? throw new RuntimeException('Không đọc được '.self::RELATIVE_PATH.'.') : $document;
    }

    // Phần hướng dẫn, bỏ frontmatter chỉ dành cho trình nạp skill.
    public function instructions(): string
    {
        return trim((string) preg_replace(self::FRONTMATTER_PATTERN, '', $this->document(), 1));
    }
}
