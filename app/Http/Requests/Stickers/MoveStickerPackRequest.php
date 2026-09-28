<?php

namespace App\Http\Requests\Stickers;

use App\Http\Middleware\EnsureStickerLibraryAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Kho đích của bộ sticker: `account` = kho riêng của account trên URL,
// `platform` = kho nền tảng. Quyền do route quyết.
class MoveStickerPackRequest extends FormRequest
{
    public const DESTINATIONS = [
        EnsureStickerLibraryAccess::ACCOUNT_LIBRARY,
        EnsureStickerLibraryAccess::PLATFORM_LIBRARY,
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['library' => ['required', 'string', Rule::in(self::DESTINATIONS)]];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'library.required' => __('errors.sticker_library.invalid_destination'),
            'library.in' => __('errors.sticker_library.invalid_destination'),
        ];
    }

    public function movesToAccountLibrary(): bool
    {
        return $this->validated('library') === EnsureStickerLibraryAccess::ACCOUNT_LIBRARY;
    }
}
