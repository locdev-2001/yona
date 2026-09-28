<?php

namespace App\Http\Requests\Stickers;

use App\Models\StickerMcpToken;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Quyền theo phạm vi do controller hỏi StickerLibraryAccess sau khi kiểm dữ liệu.
class StoreStickerMcpTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:'.StickerMcpToken::MAX_NAME_LENGTH],
            'scope' => ['required', 'string', Rule::in(StickerMcpToken::SCOPES)],
        ];
    }

    public function tokenName(): string
    {
        return trim((string) $this->validated('name'));
    }

    public function tokenScope(): string
    {
        return (string) $this->validated('scope');
    }
}
