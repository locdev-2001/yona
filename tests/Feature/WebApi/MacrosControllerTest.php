<?php

use App\Jobs\MacrosExecutionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Macro;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->administrator->id,
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->otherAgent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->otherAgent->id]);

    $this->url = "/api/v1/accounts/{$this->account->id}/macros";
});

function d3ApiMacro(User $author, string $visibility = 'personal'): Macro
{
    return Macro::factory()->create([
        'account_id' => test()->account->id,
        'created_by_id' => $author->id,
        'updated_by_id' => $author->id,
        'visibility' => $visibility,
    ]);
}

function d3SignedUpload(int $accountId, string $filename = 'avatar.png'): string
{
    Storage::fake('public');

    return Attachment::signUpload(
        Attachment::storeUpload(UploadedFile::fake()->image($filename), $accountId)
    );
}

function d3MacroPayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Add label, send message and close the chat',
        'visibility' => 'global',
        'actions' => [
            ['action_name' => 'add_label', 'action_params' => ['support', 'priority_customer']],
            ['action_name' => 'remove_assigned_agent'],
            ['action_name' => 'send_message', 'action_params' => ['Welcome to the yona platform.']],
            ['action_name' => 'resolve_conversation'],
        ],
    ], $overrides);
}

it('lists global macros plus the caller own personal ones', function () {
    d3ApiMacro($this->administrator, 'global');
    d3ApiMacro($this->administrator, 'global');
    d3ApiMacro($this->administrator);
    d3ApiMacro($this->agent);
    d3ApiMacro($this->otherAgent);

    $this->getJson($this->url)->assertUnauthorized();

    $adminVisible = $this->actingAs($this->administrator)->getJson($this->url)
        ->assertOk()->json('payload');
    expect($adminVisible)->toHaveCount(3);

    $agentVisible = $this->actingAs($this->agent)->getJson($this->url)
        ->assertOk()->json('payload');
    expect($agentVisible)->toHaveCount(3)
        ->and(collect($agentVisible)->pluck('id')->all())
        ->toBe(collect($agentVisible)->pluck('id')->sort()->values()->all());
});

it('creates a macro and records the author', function () {
    $payload = $this->actingAs($this->administrator)->postJson($this->url, d3MacroPayload())
        ->assertOk()->json('payload');

    expect($payload['name'])->toBe('Add label, send message and close the chat')
        ->and($payload['visibility'])->toBe('global')
        ->and($payload['created_by']['id'])->toBe($this->administrator->id)
        ->and($payload['updated_by']['id'])->toBe($this->administrator->id)
        ->and($payload['account_id'])->toBe($this->account->id)
        ->and($payload)->not->toHaveKey('files');
});

it('forces personal visibility when an agent creates a macro', function () {
    $payload = $this->actingAs($this->agent)->postJson($this->url, d3MacroPayload())
        ->assertOk()->json('payload');

    expect($payload['visibility'])->toBe('personal')
        ->and($payload['created_by']['id'])->toBe($this->agent->id);
});

it('rejects unsupported action names', function () {
    $this->actingAs($this->administrator)
        ->postJson($this->url, d3MacroPayload(['actions' => [['action_name' => 'update_last_seen']]]))
        ->assertStatus(422)
        ->assertJsonPath('error.actions.0', 'Macro execution actions update_last_seen not supported.');
});

it('stores an uploaded file for send_attachment and swaps the signed reference for its id', function () {
    $signedId = d3SignedUpload($this->account->id);

    $payload = $this->actingAs($this->administrator)->postJson($this->url, d3MacroPayload(['actions' => [
        ['action_name' => 'send_message', 'action_params' => ['Welcome.']],
        ['action_name' => 'send_attachment', 'action_params' => [$signedId]],
    ]]))->assertOk()->json('payload');

    $macro = Macro::latest('id')->first();

    expect($macro->files)->toHaveCount(1)
        ->and($payload['actions'][1]['action_params'][0])->toBe($macro->files->first()->id)
        ->and($payload['files'][0]['blob_id'])->toBe($macro->files->first()->id)
        ->and($payload['files'][0]['filename'])->toBe('avatar.png')
        ->and($payload['files'][0]['macro_id'])->toBe($macro->id);
});

it('refuses an invalid attachment reference on create and on update', function () {
    $this->actingAs($this->administrator)->postJson($this->url, d3MacroPayload(['actions' => [
        ['action_name' => 'send_attachment', 'action_params' => ['invalid_blob_id']],
    ]]))->assertStatus(422)->assertJsonPath('error', 'Invalid attachment');

    $macro = d3ApiMacro($this->administrator);

    $this->actingAs($this->administrator)->putJson("{$this->url}/{$macro->id}", ['actions' => [
        ['action_name' => 'send_attachment', 'action_params' => [999999]],
    ]])->assertStatus(422)->assertJsonPath('error', 'Invalid attachment');
});

it('keeps an already attached file when the macro is updated again', function () {
    $signedId = d3SignedUpload($this->account->id);
    $macro = d3ApiMacro($this->administrator);

    $created = $this->actingAs($this->administrator)->putJson("{$this->url}/{$macro->id}", ['actions' => [
        ['action_name' => 'send_attachment', 'action_params' => [$signedId]],
    ]])->assertOk()->json('payload');

    $fileId = $created['actions'][0]['action_params'][0];

    $updated = $this->actingAs($this->administrator)->putJson("{$this->url}/{$macro->id}", ['actions' => [
        ['action_name' => 'send_attachment', 'action_params' => [$fileId]],
    ]])->assertOk()->json('payload');

    expect($updated['actions'][0]['action_params'][0])->toBe($fileId)
        ->and($macro->fresh()->files)->toHaveCount(1);
});

it('updates a macro the caller owns and refuses the ones it does not', function () {
    $macro = d3ApiMacro($this->administrator);

    $this->putJson("{$this->url}/{$macro->id}")->assertUnauthorized();

    $this->actingAs($this->administrator)->putJson("{$this->url}/{$macro->id}", ['name' => 'Renamed'])
        ->assertOk()
        ->assertJsonPath('payload.name', 'Renamed')
        ->assertJsonPath('payload.visibility', 'personal');

    $agentMacro = d3ApiMacro($this->agent);
    $this->actingAs($this->otherAgent)->putJson("{$this->url}/{$agentMacro->id}", ['name' => 'Renamed'])
        ->assertUnauthorized()
        ->assertJsonPath('error', 'You are not authorized to do this action');

    // Macro global vẫn do admin quản, kể cả khi tác giả là agent.
    $agentGlobalMacro = d3ApiMacro($this->agent, 'global');
    $this->actingAs($this->agent)->putJson("{$this->url}/{$agentGlobalMacro->id}", ['name' => 'Renamed'])
        ->assertUnauthorized();
});

it('fetches one macro and guards personal ones from other agents', function () {
    $macro = d3ApiMacro($this->administrator);

    $this->getJson("{$this->url}/{$macro->id}")->assertUnauthorized();

    $this->actingAs($this->administrator)->getJson("{$this->url}/{$macro->id}")
        ->assertOk()
        ->assertJsonPath('payload.name', $macro->name)
        ->assertJsonPath('payload.created_by.id', $this->administrator->id);

    $this->actingAs($this->administrator)->getJson("{$this->url}/999999")->assertNotFound();

    $foreignMacro = Macro::factory()->create(['account_id' => Account::factory()->create()->id]);
    $this->actingAs($this->administrator)->getJson("{$this->url}/{$foreignMacro->id}")->assertNotFound();

    $agentMacro = d3ApiMacro($this->agent);
    $this->actingAs($this->otherAgent)->getJson("{$this->url}/{$agentMacro->id}")->assertUnauthorized();

    $agentGlobalMacro = d3ApiMacro($this->agent, 'global');
    $this->actingAs($this->otherAgent)->getJson("{$this->url}/{$agentGlobalMacro->id}")->assertOk();
});

it('deletes macros following the same authorship rules', function () {
    $macro = d3ApiMacro($this->administrator);
    $this->actingAs($this->administrator)->deleteJson("{$this->url}/{$macro->id}")->assertOk();
    expect(Macro::find($macro->id))->toBeNull();

    $agentMacro = d3ApiMacro($this->agent);
    $this->actingAs($this->otherAgent)->deleteJson("{$this->url}/{$agentMacro->id}")->assertUnauthorized();

    $agentGlobalMacro = d3ApiMacro($this->agent, 'global');
    $this->actingAs($this->agent)->deleteJson("{$this->url}/{$agentGlobalMacro->id}")->assertUnauthorized();

    // Macro global mồ côi: admin xóa được, agent thì không.
    $orphanMacro = d3ApiMacro($this->agent, 'global');
    $this->agent->delete();
    expect($orphanMacro->fresh()->created_by_id)->toBeNull();

    $this->actingAs($this->otherAgent)->deleteJson("{$this->url}/{$orphanMacro->id}")->assertUnauthorized();
    $this->actingAs($this->administrator)->deleteJson("{$this->url}/{$orphanMacro->id}")->assertOk();
});

it('queues the execution job for the selected conversations', function () {
    Queue::fake();

    $macro = d3ApiMacro($this->administrator);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id]);

    $this->postJson("{$this->url}/{$macro->id}/execute")->assertUnauthorized();

    $this->actingAs($this->administrator)
        ->postJson("{$this->url}/{$macro->id}/execute", ['conversation_ids' => [$conversation->display_id]])
        ->assertOk();

    Queue::assertPushedOn('medium', MacrosExecutionJob::class);

    $agentMacro = d3ApiMacro($this->agent);
    $this->actingAs($this->otherAgent)
        ->postJson("{$this->url}/{$agentMacro->id}/execute", ['conversation_ids' => [$conversation->display_id]])
        ->assertUnauthorized();
});
