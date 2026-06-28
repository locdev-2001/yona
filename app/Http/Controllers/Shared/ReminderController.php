<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reminders\StoreReminderRequest;
use App\Http\Requests\Reminders\UpdateReminderRequest;
use App\Models\Reminder;
use App\Models\User;
use App\Services\ReminderService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

/**
 * Thin controller for Reminder CRUD.
 * Route-model binding + BelongsToWorkspace global scope ensures cross-workspace
 * access returns 404 automatically (non-enumeration, BR-X15).
 */
class ReminderController extends Controller
{
    public function store(StoreReminderRequest $request, ReminderService $service): RedirectResponse
    {
        $recipient = User::findOrFail($request->integer('user_id'));
        $subject = $this->resolveSubject(
            $request->string('remindable_type')->toString(),
            $request->string('remindable_id')->toString(),
        );

        $service->create(
            subject: $subject,
            recipient: $recipient,
            remindAt: Carbon::parse($request->string('remind_at')->toString()),
            description: $request->string('description')->toString(),
        );

        return back()->with('success', __('reminder.created'));
    }

    public function update(UpdateReminderRequest $request, Reminder $reminder, ReminderService $service): RedirectResponse
    {
        $this->authorize('update', $reminder);

        // Optimistic lock: inject lock_version from request into the model's
        // original snapshot so HasOptimisticLock compares against the right version.
        $reminder->forceFill(['lock_version' => $request->integer('lock_version')])->syncOriginal();

        $service->update(
            reminder: $reminder,
            remindAt: Carbon::parse($request->string('remind_at')->toString()),
            description: $request->string('description')->toString(),
        );

        return back()->with('success', __('reminder.updated'));
    }

    public function destroy(Reminder $reminder, ReminderService $service): RedirectResponse
    {
        $this->authorize('delete', $reminder);

        $service->delete($reminder);

        return back()->with('success', __('reminder.deleted'));
    }

    private function resolveSubject(string $morphType, string $subjectId): Model
    {
        $morphMap = Relation::morphMap();

        if (! isset($morphMap[$morphType])) {
            abort(422, "Unknown remindable_type: {$morphType}");
        }

        /** @var class-string<Model> $modelClass */
        $modelClass = $morphMap[$morphType];
        $subject = $modelClass::find($subjectId);

        if ($subject === null) {
            abort(404);
        }

        return $subject;
    }
}
