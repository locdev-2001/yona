<?php

namespace Modules\Announcements\Http\Requests\Admin;

use App\Rules\PublicHttpUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Announcements\Enums\AnnouncementCategory;
use Modules\Announcements\Rules\AnnouncementAudienceRule;

/**
 * Validates + authorizes creating a new announcement.
 *
 * Server-controlled fields (status, published_at, created_by, updated_by) are
 * excluded — set exclusively in AnnouncementService (BR-X12).
 *
 * Uses admin guard for authorize() — never web guard.
 */
class AnnouncementStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check()
            && auth('admin')->user()?->can('platform.announcements.manage') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('announcements', 'slug')->whereNull('deleted_at')],
            'body' => ['required', 'string', 'max:20000'],
            'category' => ['required', Rule::in(AnnouncementCategory::values())],
            'cover_image' => ['nullable', 'string', 'url', 'starts_with:https', new PublicHttpUrl],
            'audience' => ['required', new AnnouncementAudienceRule],
        ];
    }
}
