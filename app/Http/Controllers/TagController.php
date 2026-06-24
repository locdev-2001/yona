<?php

namespace App\Http\Controllers;

use App\Http\Requests\SyncTagsRequest;
use App\Models\Tag;
use App\Services\TagService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

/**
 * Tags: list for autocomplete + sync for an entity.
 * Workspace scoping via BelongsToWorkspace global scope.
 */
class TagController extends Controller
{
    /**
     * Autocomplete list: all active tags in the current workspace.
     */
    public function index(): JsonResponse
    {
        $tags = Tag::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'color']);

        return response()->json($tags);
    }

    /**
     * Sync tags for a given entity. Replaces full tag set with dedupe + order.
     */
    public function sync(SyncTagsRequest $request, TagService $service): RedirectResponse
    {
        $type = $request->string('attachable_type')->toString();
        $id = $request->string('attachable_id')->toString();

        $modelClass = Relation::getMorphedModel($type);
        abort_unless($modelClass && array_key_exists($type, Relation::morphMap()), 404);

        /** @var Model $entity */
        $entity = $modelClass::findOrFail($id);

        $service->sync($entity, $request->input('tags', []));

        return back()->with('success', __('tags.synced'));
    }
}
