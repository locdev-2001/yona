<?php

namespace App\Models\Concerns;

use App\Models\Note;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Expose the notes polymorphic relation on any workspace entity.
 * Notes are internal staff-only — no portal visibility flag.
 * Business logic (add, update, delete) lives in NoteService.
 *
 * @phpstan-require-extends Model
 */
trait HasNotes
{
    /** @return MorphMany<Note, $this> */
    public function notes(): MorphMany
    {
        return $this->morphMany(Note::class, 'noteable')->latest();
    }
}
