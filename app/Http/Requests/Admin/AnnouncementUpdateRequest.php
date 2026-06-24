<?php

namespace App\Http\Requests\Admin;

use App\Enums\AnnouncementCategory;
use App\Rules\AnnouncementAudienceRule;
use App\Rules\PublicHttpUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates + authorizes updating an existing announcement.
 *
 * Slug unique check ignores the current record (soft-delete-aware partial index).
 * Server-controlled fields remain excluded (BR-X12).
 *
 * Uses admin guard for authorize() — never web guard.
 */
class AnnouncementUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check()
            && auth('admin')->user()?->can('platform.announcements.manage') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var string|null $announcementId */
        $announcementId = $this->route('announcement')?->id;

        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('announcements', 'slug')
                    ->whereNull('deleted_at')
                    ->ignore($announcementId),
            ],
            'body' => ['required', 'string', 'max:20000'],
            'category' => ['required', Rule::in(AnnouncementCategory::values())],
            'cover_image' => ['nullable', 'string', 'url', 'starts_with:https', new PublicHttpUrl],
            'audience' => ['required', new AnnouncementAudienceRule],
        ];
    }
}
