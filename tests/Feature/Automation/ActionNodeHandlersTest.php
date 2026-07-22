<?php

use App\Models\Conversation;
use App\Models\Lead;
use App\Models\Message;
use App\Models\PipelineStage;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\WorkflowRunLog;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Automation\WorkflowEngine;
use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\Contracts\ChannelCapabilities;
use App\Modules\Integration\Contracts\ChannelDriver;
use App\Services\TagService;
use Illuminate\Support\Str;

// Phase 03 — Action node handlers: delegate to existing Domain Services.
// Real services + real DB assertions throughout (matches this repo's testing
// convention — see ReminderService/LeadConversionTest — rather than mocking
// service calls), except ChannelManager's outbound send, which needs a fake
// driver registered per-test (the real Zalo driver needs a live bridge).

class FakeSendOnlyChannelDriver implements ChannelDriver
{
    public array $sent = [];

    public function channelKey(): string
    {
        return 'test_fake_channel';
    }

    public function connect(string $workspaceId, array $params): void {}

    public function disconnect(string $workspaceId): void {}

    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        $this->sent[] = [$conversation->id, $payload];

        return Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'body' => $payload['body'] ?? '',
            'source_id' => 'test-'.Str::uuid(),
        ]);
    }

    public function parseInbound(array $raw): array
    {
        return [];
    }

    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities;
    }
}

function makeConversationForLead(Workspace $ws, string $leadId, string $channel = 'test_fake_channel'): Conversation
{
    return Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => $channel,
        'peer_uid' => 'peer-'.Str::uuid(),
        'thread_type' => 0,
        'lead_id' => $leadId,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);
}

function singleActionGraph(string $nodeType, array $config): array
{
    return [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => []],
            ['id' => 'n_action', 'type' => $nodeType, 'config' => $config],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_action', 'branch' => null],
            ['from' => 'n_action', 'to' => 'n_end', 'branch' => null],
        ],
    ];
}

it('SendMessageNodeHandler sends on the resolved conversation for a lead subject', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $fakeDriver = new FakeSendOnlyChannelDriver;
    app(ChannelManager::class)->extend('test_fake_channel', fn () => $fakeDriver);

    $lead = Lead::factory()->create();
    $conversation = makeConversationForLead($ws, $lead->id);

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('send_message', ['channel' => 'test_fake_channel', 'body' => 'hello from automation']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($fakeDriver->sent)->toHaveCount(1);
    expect($fakeDriver->sent[0][0])->toBe($conversation->id);
    expect($fakeDriver->sent[0][1]['body'])->toBe('hello from automation');
});

it('SendMessageNodeHandler skips (not fails) when no conversation exists on the chosen channel', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $fakeDriver = new FakeSendOnlyChannelDriver;
    app(ChannelManager::class)->extend('test_fake_channel', fn () => $fakeDriver);

    $lead = Lead::factory()->create();
    // No conversation created for this lead on any channel.

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('send_message', ['channel' => 'test_fake_channel', 'body' => 'hi']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($fakeDriver->sent)->toHaveCount(0);

    $log = WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_id', 'n_action')->first();
    expect($log->result)->toBe(WorkflowRunLog::RESULT_SKIPPED);
});

it('CreateTaskNodeHandler creates a Task with related_type=lead for a lead subject', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('create_task', ['name' => 'Follow up', 'priority' => Task::PRIORITY_HIGH]),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);

    $task = Task::where('related_type', 'lead')->where('related_id', $lead->id)->first();
    expect($task)->not->toBeNull();
    expect($task->name)->toBe('Follow up');
    expect($task->priority)->toBe(Task::PRIORITY_HIGH);
});

it('CreateTaskNodeHandler skips (does not create a Task) when subject_type=conversation', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    $conversation = makeConversationForLead($ws, $lead->id);

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('create_task', ['name' => 'Should not exist']),
    ]);

    $tasksBefore = Task::count();

    $run = app(WorkflowEngine::class)->enroll($workflow, 'conversation', $conversation->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect(Task::count())->toBe($tasksBefore);

    $log = WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_id', 'n_action')->first();
    expect($log->result)->toBe(WorkflowRunLog::RESULT_SKIPPED);
});

it('TagNodeHandler attaches a tag to the subject', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('tag', ['tag' => 'hot-lead']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($lead->fresh()->tags()->where('name', 'hot-lead')->exists())->toBeTrue();
});

it('TagNodeHandler detaches a tag attached under different casing (matches attach()\'s slug identity)', function () {
    // Regression: detach used to look up Tag::where('name', $tagName) — a
    // different literal string than attach()'s Str::slug($name) dedup key,
    // so "Hot Lead" (attach) vs "hot lead" (detach config) would silently
    // report "tag does not exist" instead of detaching the real tag.
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    app(TagService::class)->attach($lead, 'Hot Lead');
    expect($lead->fresh()->tags()->where('name', 'Hot Lead')->exists())->toBeTrue();

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('tag', ['tag' => 'hot lead', 'action' => 'detach']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($lead->fresh()->tags()->where('name', 'Hot Lead')->exists())->toBeFalse();

    $log = WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_id', 'n_action')->first();
    expect($log->result)->toBe(WorkflowRunLog::RESULT_SUCCESS);
});

it('NotifyInternalNodeHandler skips (not fails) when no recipients are configured', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('notify_internal', ['user_ids' => [], 'message' => 'no one to tell']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);

    $log = WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_id', 'n_action')->first();
    expect($log->result)->toBe(WorkflowRunLog::RESULT_SKIPPED);
});

it('ChangeLeadStageNodeHandler moves the lead to the configured stage', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    // LeadFactory seeds its own pipeline with only 1 stage — add a 2nd stage
    // in the same pipeline to move to.
    $targetStage = PipelineStage::factory()->create([
        'pipeline_id' => $lead->pipeline_id,
        'stage_order' => 1,
    ]);

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('change_lead_stage', ['stage_id' => $targetStage->id, 'order' => 0]),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($lead->fresh()->stage_id)->toBe($targetStage->id);
});

it('ChangeLeadStageNodeHandler skips when subject_type is not lead', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $lead = Lead::factory()->create();
    $conversation = makeConversationForLead($ws, $lead->id);
    $stageBefore = $lead->stage_id;

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('change_lead_stage', ['stage_id' => 'irrelevant']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'conversation', $conversation->id);
    actingInWorkspace($ws, $user);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($lead->fresh()->stage_id)->toBe($stageBefore);

    $log = WorkflowRunLog::where('workflow_run_id', $run->id)->where('node_id', 'n_action')->first();
    expect($log->result)->toBe(WorkflowRunLog::RESULT_SKIPPED);
});

it('NotifyInternalNodeHandler creates a database notification for the configured recipient', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    seedMember($ws, $recipient, 'sales_rep');
    // NotificationService::notify() has a self-notify guard (actor never
    // notifies themselves) — recipient must differ from the acting user.
    actingInWorkspace($ws, $actor);

    $lead = Lead::factory()->create();

    $workflow = Workflow::factory()->create([
        'graph' => singleActionGraph('notify_internal', ['user_ids' => [$recipient->id], 'message' => 'check this lead']),
    ]);

    $run = app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
    actingInWorkspace($ws, $actor);
    $run->refresh();

    expect($run->status)->toBe(WorkflowRun::STATUS_COMPLETED);
    expect($recipient->notifications()->count())->toBe(1);
});
