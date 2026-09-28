<?php

namespace App\Mcp\Prompts;

use App\Http\Requests\Stickers\StickerPackRequest;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerPackSkill;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

// Skill tạo bộ sticker phát qua MCP: client gọi prompt là có đủ quy trình, không
// cần cài tệp SKILL.md. Nội dung đọc thẳng từ StickerPackSkill.
#[Name(self::NAME)]
#[Description('Quy trình tạo trọn một bộ sticker động đồng bộ một nhân vật: chuẩn bị khoá nhận diện, phác dáng chính, tạo từng cảm xúc có xem thử và tự kiểm, rồi đóng gói và xuất bản. Mọi tham số đều tuỳ chọn, bỏ trống thì AI tự suy ra.')]
class DesignStickerPackPrompt extends Prompt
{
    public const NAME = 'design_sticker_pack';

    private const MAX_TEXT_LENGTH = 500;

    private const EMPTY_VALUE = '(bỏ trống, tự suy ra theo skill)';

    /** @var array<string, string> */
    private const ARGUMENT_LABELS = [
        'idea' => 'Ý tưởng nhân vật hoặc thương hiệu shop',
        'pack_name' => 'Tên bộ',
        'style' => 'Phong cách',
        'sticker_count' => 'Số sticker',
    ];

    /** @return array<int, Argument> */
    public function arguments(): array
    {
        return [
            new Argument('idea', 'Ý tưởng nhân vật hoặc thương hiệu shop, ví dụ "mèo cam cho shop trà sữa".'),
            new Argument('pack_name', 'Tên bộ sticker.'),
            new Argument('style', 'Phong cách: auto, cute-flat, minimal, vibrant hoặc brand.'),
            new Argument('sticker_count', 'Số sticker muốn tạo.'),
        ];
    }

    public function handle(Request $request, StickerPackSkill $skill): Response
    {
        $validated = $request->validate([
            'idea' => ['nullable', 'string', 'max:'.self::MAX_TEXT_LENGTH],
            'pack_name' => ['nullable', 'string', 'max:'.StickerPackRequest::MAX_NAME_LENGTH],
            'style' => ['nullable', 'string', 'max:'.self::MAX_TEXT_LENGTH],
            'sticker_count' => ['nullable', 'integer', 'min:1', 'max:'.StickerLibraryManager::MAX_STICKERS_PER_PACK],
        ]);

        $requestLines = array_map(
            fn (string $argument, string $label) => "- {$label}: ".(filled($validated[$argument] ?? null) ? trim((string) $validated[$argument]) : self::EMPTY_VALUE),
            array_keys(self::ARGUMENT_LABELS),
            self::ARGUMENT_LABELS,
        );

        return Response::text($skill->instructions()."\n\n## Yêu cầu của người dùng lần này\n\n".implode("\n", $requestLines)."\n");
    }
}
