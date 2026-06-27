<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAttachmentRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Modules\Shared\Models\Attachment;
use Modules\Shared\Services\AttachmentService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Thin controller: parse → authorize → delegate to AttachmentService.
 * Download secured by attachment_key (non-enumeration). workspace cross-check
 * via BelongsToWorkspace global scope (firstOrFail → 404 on wrong workspace).
 */
class AttachmentController extends Controller
{
    public function store(StoreAttachmentRequest $request, AttachmentService $service): RedirectResponse
    {
        $type = $request->string('attachable_type')->toString();
        $id = $request->string('attachable_id')->toString();

        $modelClass = Relation::getMorphedModel($type);
        abort_unless((bool) $modelClass, 404);

        /** @var Model $parent */
        $parent = $modelClass::findOrFail($id);

        $service->store(
            $parent,
            $request->file('file'),
            (bool) $request->input('visible_to_customer', false)
        );

        return back()->with('success', __('attachments.uploaded'));
    }

    /**
     * Download via attachment_key — no uuid exposed, workspace-scoped lookup.
     */
    public function download(string $attachmentKey): StreamedResponse|RedirectResponse
    {
        /** @var Attachment $attachment */
        $attachment = Attachment::where('attachment_key', $attachmentKey)->firstOrFail();

        $this->authorize('view', $attachment);

        if ($attachment->external_link) {
            return redirect()->away($attachment->external_link);
        }

        abort_unless($attachment->path && Storage::disk(config('filesystems.default'))->exists($attachment->path), 404);

        return Storage::disk(config('filesystems.default'))->download(
            $attachment->path,
            $attachment->original_name
        );
    }

    public function destroy(Attachment $attachment, AttachmentService $service): RedirectResponse
    {
        $this->authorize('delete', $attachment);
        $service->delete($attachment);

        return back()->with('success', __('attachments.deleted'));
    }
}
