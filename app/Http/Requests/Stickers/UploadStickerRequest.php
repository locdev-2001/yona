<?php

namespace App\Http\Requests\Stickers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

// Chỉ đòi có tệp; đuôi, kích thước và nội dung do StickerUploadService kiểm để
// câu lỗi đồng nhất ở mọi mặt tiền (errors.sticker_uploads.*).
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
            'label' => ['nullable', 'string', 'max:255'],
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
}
