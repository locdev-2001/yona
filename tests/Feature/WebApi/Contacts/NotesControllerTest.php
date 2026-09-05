<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Note;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/contacts/notes_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
});

describe('GET /api/v1/accounts/{id}/contacts/{contactId}/notes', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes")
            ->assertUnauthorized();
    });

    it('returns the notes newest first with the author', function () {
        $older = Note::factory()->create([
            'contact_id' => $this->contact->id,
            'user_id' => $this->agent->id,
            'content' => 'ghi chú cũ',
            'created_at' => now()->subDay(),
        ]);
        $newer = Note::factory()->create([
            'contact_id' => $this->contact->id,
            'user_id' => $this->agent->id,
            'content' => 'ghi chú mới',
        ]);

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes")
            ->assertOk();

        expect(array_column($response->json(), 'id'))->toBe([$newer->id, $older->id])
            ->and($response->json('0.user.id'))->toBe($this->agent->id)
            ->and($response->json('0.created_at'))->toBeInt();
    });

    it('returns not found for a contact of another account', function () {
        $otherContact = Contact::factory()->create();

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$otherContact->id}/notes")
            ->assertNotFound();
    });
});

describe('POST /api/v1/accounts/{id}/contacts/{contactId}/notes', function () {
    it('creates a note owned by the current user', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes", [
                'content' => 'khách muốn đổi hàng',
            ])
            ->assertOk()
            ->assertJsonPath('content', 'khách muốn đổi hàng')
            ->assertJsonPath('user.id', $this->agent->id);

        expect(Note::where('contact_id', $this->contact->id)->count())->toBe(1)
            ->and(Note::first()->account_id)->toBe($this->account->id);
    });

    it('rejects an empty note', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes", ['content' => ''])
            ->assertStatus(422);
    });
});

describe('PATCH and DELETE /api/v1/accounts/{id}/contacts/{contactId}/notes/{noteId}', function () {
    it('updates the content', function () {
        $note = Note::factory()->create(['contact_id' => $this->contact->id, 'user_id' => $this->agent->id]);

        $this->actingAs($this->agent)
            ->patchJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes/{$note->id}", [
                'content' => 'nội dung đã sửa',
            ])
            ->assertOk()
            ->assertJsonPath('content', 'nội dung đã sửa');
    });

    it('deletes the note', function () {
        $note = Note::factory()->create(['contact_id' => $this->contact->id, 'user_id' => $this->agent->id]);

        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes/{$note->id}")
            ->assertOk();

        expect(Note::count())->toBe(0);
    });

    it('returns not found for a note of another contact', function () {
        $note = Note::factory()->create(['user_id' => $this->agent->id]);

        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/notes/{$note->id}")
            ->assertNotFound();
    });
});
