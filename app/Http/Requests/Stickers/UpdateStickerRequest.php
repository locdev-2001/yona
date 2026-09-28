<?php

namespace App\Http\Requests\Stickers;

use App\Models\Sticker;
use App\Services\Stickers\StickerTags;
use Illuminate\Foundation\Http\FormRequest;

// Sửa nhãn và từ khoá. Khoá nào không gửi thì giữ nguyên giá trị đang có.
class UpdateStickerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return StickerTags::validationRules();
    }

    public function stickerLabel(Sticker $current): ?string
    {
        return $this->has('label') ? $this->validated('label') : $current->label;
    }

    /** @return list<string> */
    public function stickerKeywords(Sticker $current): array
    {
        return array_values($this->has('keywords') ? ($this->validated('keywords') ?? []) : $current->keywords);
    }
}
