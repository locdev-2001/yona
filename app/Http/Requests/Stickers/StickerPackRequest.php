<?php

namespace App\Http\Requests\Stickers;

use Illuminate\Foundation\Http\FormRequest;

// Dùng chung cho Super Admin và tenant: quyền do route/controller quyết.
class StickerPackRequest extends FormRequest
{
    public const MAX_NAME_LENGTH = 100;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return self::nameRules();
    }

    /** @return array<string, list<string>> */
    public static function nameRules(): array
    {
        return ['name' => ['required', 'string', 'max:'.self::MAX_NAME_LENGTH]];
    }

    public function packName(): string
    {
        return trim((string) $this->validated('name'));
    }
}
