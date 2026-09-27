<?php

namespace App\Http\Requests\Stickers;

use Illuminate\Foundation\Http\FormRequest;

class ReorderStickersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'sticker_ids' => ['required', 'array'],
            'sticker_ids.*' => ['integer', 'distinct'],
        ];
    }

    /** @return list<int> */
    public function orderedStickerIds(): array
    {
        return array_map('intval', array_values($this->validated('sticker_ids')));
    }
}
