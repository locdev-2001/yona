<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNoteRequest;
use App\Http\Requests\UpdateNoteRequest;
use App\Models\Note;
use App\Services\NoteService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;

/**
 * Thin controller for notes. Auth via NotePolicy. Workspace isolation
 * via BelongsToWorkspace global scope (route-model binding → 404 cross-workspace).
 */
class NoteController extends Controller
{
    public function store(StoreNoteRequest $request, NoteService $service): RedirectResponse
    {
        $type = $request->string('noteable_type')->toString();
        $id = $request->string('noteable_id')->toString();
        $modelClass = Relation::getMorphedModel($type);
        abort_unless((bool) $modelClass, 404);

        /** @var Model $noteable */
        $noteable = $modelClass::findOrFail($id);

        $service->add(
            $noteable,
            $request->string('body')->toString(),
            $request->input('date_contacted')
        );

        return back()->with('success', __('notes.added'));
    }

    public function update(UpdateNoteRequest $request, Note $note, NoteService $service): RedirectResponse
    {
        $service->update(
            $note,
            $request->string('body')->toString(),
            $request->input('date_contacted')
        );

        return back()->with('success', __('notes.updated'));
    }

    public function destroy(Note $note, NoteService $service): RedirectResponse
    {
        $this->authorize('delete', $note);
        $service->delete($note);

        return back()->with('success', __('notes.deleted'));
    }
}
