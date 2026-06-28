<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Models\Comment;
use App\Services\CommentService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;

/**
 * Thin controller for comments. Auth via CommentPolicy. Workspace isolation
 * via BelongsToWorkspace global scope (route-model binding → 404 cross-workspace).
 */
class CommentController extends Controller
{
    public function store(StoreCommentRequest $request, CommentService $service): RedirectResponse
    {
        $service->add(
            $this->resolveCommentable($request->string('commentable_type')->toString(), $request->string('commentable_id')->toString()),
            $request->string('body')->toString(),
            $request->input('parent_id'),
            (bool) $request->input('visible_to_customer', false)
        );

        return back()->with('success', __('comments.added'));
    }

    public function update(UpdateCommentRequest $request, Comment $comment, CommentService $service): RedirectResponse
    {
        $service->update($comment, $request->string('body')->toString());

        return back()->with('success', __('comments.updated'));
    }

    public function destroy(Comment $comment, CommentService $service): RedirectResponse
    {
        $this->authorize('delete', $comment);
        $service->delete($comment);

        return back()->with('success', __('comments.deleted'));
    }

    private function resolveCommentable(string $type, string $id): Model
    {
        $modelClass = Relation::getMorphedModel($type);
        abort_unless((bool) $modelClass, 404);

        return $modelClass::findOrFail($id);
    }
}
