<?php

namespace App\Http\Requests\Stickers;

use App\Services\Stickers\StickerTags;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

// Chỉ đòi có tệp và `edit` là chuỗi; loại ảnh, dung lượng và cấu trúc thông số
// chỉnh do StickerUploadService kiểm để câu lỗi đồng nhất ở mọi mặt tiền
// (errors.sticker_uploads.*).
class UploadStickerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file'],
            'edit' => ['nullable', 'string'],
            ...StickerTags::validationRules(),
        ];
    }

    public function stickerFile(): UploadedFile
    {
        /** @var UploadedFile */
        return $this->file('file');
    }

    public function stickerLabel(): ?string
    {
        return $this->validated('label');
    }

    /** @return list<string> */
    public function stickerKeywords(): array
    {
        return array_values($this->validated('keywords') ?? []);
    }

    /** JSON thông số cắt + xoá nền; null = mặc định của trình dựng. */
    public function stickerEdit(): ?string
    {
        return $this->validated('edit');
    }
}
