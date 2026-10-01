<?php

namespace App\Http\Requests\Stickers;

use App\Models\Sticker;
use App\Services\Stickers\StickerTags;
use Illuminate\Foundation\Http\FormRequest;

// Sửa nhãn, từ khoá và chỉnh lại ảnh. Khoá nào không gửi thì giữ nguyên giá trị
// đang có. `edit` cùng hợp đồng với lúc tải lên, StickerUploadService kiểm cấu trúc.
class UpdateStickerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'edit' => ['sometimes', 'nullable', 'string'],
            ...StickerTags::validationRules(),
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return StickerTags::validationMessages();
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

    public function wantsReedit(): bool
    {
        return $this->has('edit');
    }

    /** JSON thông số cắt + xoá nền; null = mặc định của trình dựng. */
    public function stickerEdit(): ?string
    {
        return $this->validated('edit');
    }
}
