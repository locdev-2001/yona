<?php

namespace App\Http\Controllers\WebApi\Contacts;

use App\Http\Controllers\Controller;
use App\Http\Resources\NoteResource;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Contacts::NotesController.
class NotesController extends Controller
{
    public function index(Request $request, Account $account, int $contactId): JsonResponse
    {
        $notes = $this->fetchContact($account, $contactId)
            ->notes()
            ->latestFirst()
            ->with('user')
            ->get();

        return response()->json(NoteResource::collection($notes)->resolve());
    }

    public function store(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);
        $validated = $request->validate(['content' => ['required', 'string']]);

        $note = $contact->notes()->create([
            'content' => $validated['content'],
            'user_id' => $request->user()->id,
        ]);

        return response()->json((new NoteResource($note->load('user')))->resolve());
    }

    public function update(Request $request, Account $account, int $contactId, int $noteId): JsonResponse
    {
        $note = $this->fetchNote($account, $contactId, $noteId);
        $note->update($request->validate(['content' => ['required', 'string']]));

        return response()->json((new NoteResource($note->load('user')))->resolve());
    }

    public function destroy(Request $request, Account $account, int $contactId, int $noteId): JsonResponse
    {
        $this->fetchNote($account, $contactId, $noteId)->delete();

        return response()->json(null, 200);
    }

    private function fetchContact(Account $account, int $contactId): Contact
    {
        return $account->contacts()->findOrFail($contactId);
    }

    private function fetchNote(Account $account, int $contactId, int $noteId): Note
    {
        return $this->fetchContact($account, $contactId)->notes()->findOrFail($noteId);
    }
}
