<?php

use App\Models\Client;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

/**
 * FIX 3 — AttachmentPolicy::create within-workspace authz.
 *
 * Trước fix: create() return true vô điều kiện → BẤT KỲ member nào (kể cả viewer
 * read-only) cũng đính file vào BẤT KỲ resource, bất chấp quyền edit. RLS chỉ chặn
 * cross-workspace; đây bịt lỗ within-workspace.
 *
 * Sau fix: create() đòi quyền `update` trên parent. viewer (chỉ có client.view,
 * KHÔNG có client.update) → 403; sales_manager (có client.update) → thành công.
 */
function postAttachmentToClient(User $user, Workspace $ws, Client $client): TestResponse
{
    return test()
        ->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('attachments.store'), [
            'attachable_type' => 'client',
            'attachable_id' => $client->id,
            'file' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
        ]);
}

beforeEach(function () {
    Storage::fake(config('filesystems.default'));
});

it('viewer (no client.update) gets 403 when attaching a file to a Client', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    actingInWorkspace($ws, $viewer);
    $client = Client::factory()->create();
    clearWorkspaceContext();

    postAttachmentToClient($viewer, $ws, $client)->assertForbidden();
});

it('member with client.update can attach a file to a Client', function () {
    $ws = Workspace::factory()->create();
    $manager = User::factory()->create();
    seedMember($ws, $manager, 'sales_manager');

    actingInWorkspace($ws, $manager);
    $client = Client::factory()->create();
    clearWorkspaceContext();

    postAttachmentToClient($manager, $ws, $client)
        ->assertRedirect(); // controller back()->with('success') on store

    actingInWorkspace($ws, $manager);
    expect($client->attachments()->count())->toBe(1);
});
