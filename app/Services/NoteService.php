<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use App\Models\Note;

/**
 * Owns note write operations (internal staff notes — no portal visibility).
 * date_contacted is stored for P07 lead.last_contact computation.
 */
class NoteService
{
    /**
     * Add a note to any entity. user_id and workspace_id are server-controlled.
     */
    public function add(Model $noteable, string $body, ?string $dateContacted = null): Note
    {
        $note = new Note;
        $note->workspace_id = currentWorkspace()->id;
        $note->user_id = auth()->id();
        $note->noteable_type = $noteable->getMorphClass();
        $note->noteable_id = $noteable->getKey();
        $note->body = $body;
        $note->date_contacted = $dateContacted ? Carbon::parse($dateContacted) : null;
        $note->save();

        return $note;
    }

    public function update(Note $note, string $body, ?string $dateContacted = null): void
    {
        $note->body = $body;
        $note->date_contacted = $dateContacted ? Carbon::parse($dateContacted) : null;
        $note->save();
    }

    public function delete(Note $note): void
    {
        $note->delete();
    }
}
