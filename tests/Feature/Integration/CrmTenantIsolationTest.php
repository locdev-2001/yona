<?php

use App\Models\Client;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Project;
use App\Models\Task;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Support\Facades\DB;

// ── CRM Tenant Isolation: 2-workspace pattern cho Client/Lead/Project/Task ────
// Theo TenantIsolationTest pattern (BR-X01/X11): Layer 1 (global scope) + Layer 3 (RLS).

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLeadInWorkspace(Workspace $ws): Lead
{
    actingInWorkspace($ws);
    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    return Lead::factory()->create([
        'workspace_id' => $ws->id,
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'lead_number' => rand(100, 9999),
    ]);
}

// ─── Client isolation ─────────────────────────────────────────────────────────

it('isolates clients across workspaces', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Client::factory()->count(3)->create();

    actingInWorkspace($b);
    Client::factory()->count(2)->create();

    actingInWorkspace($a);
    expect(Client::count())->toBe(3);

    actingInWorkspace($b);
    expect(Client::count())->toBe(2);
});

it('cannot resolve a cross-workspace client — scope AND RLS deny', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    $client = Client::factory()->create();

    actingInWorkspace($b);
    expect(Client::find($client->id))->toBeNull();                        // Layer 1 global scope
    expect(Client::withoutGlobalScopes()->find($client->id))->toBeNull(); // Layer 3 RLS
});

it('raw SQL returns 0 client rows for WS-A when context is WS-B', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Client::factory()->count(2)->create();

    setWorkspaceContext($b->id);
    expect(DB::table('clients')->where('workspace_id', $a->id)->count())->toBe(0);
});

// ─── Lead isolation ───────────────────────────────────────────────────────────

it('isolates leads across workspaces', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    makeLeadInWorkspace($a);
    makeLeadInWorkspace($a);
    makeLeadInWorkspace($a);

    makeLeadInWorkspace($b);
    makeLeadInWorkspace($b);

    actingInWorkspace($a);
    expect(Lead::count())->toBe(3);

    actingInWorkspace($b);
    expect(Lead::count())->toBe(2);
});

it('cannot resolve a cross-workspace lead — scope AND RLS deny', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    $lead = makeLeadInWorkspace($a);

    actingInWorkspace($b);
    expect(Lead::find($lead->id))->toBeNull();
    expect(Lead::withoutGlobalScopes()->find($lead->id))->toBeNull();
});

it('raw SQL returns 0 lead rows for WS-A when context is WS-B', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    makeLeadInWorkspace($a);
    makeLeadInWorkspace($a);

    setWorkspaceContext($b->id);
    expect(DB::table('leads')->where('workspace_id', $a->id)->count())->toBe(0);
});

// ─── Project isolation ────────────────────────────────────────────────────────

it('isolates projects across workspaces', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Project::factory()->count(4)->create();

    actingInWorkspace($b);
    Project::factory()->count(1)->create();

    actingInWorkspace($a);
    expect(Project::count())->toBe(4);

    actingInWorkspace($b);
    expect(Project::count())->toBe(1);
});

it('cannot resolve a cross-workspace project — scope AND RLS deny', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    $project = Project::factory()->create();

    actingInWorkspace($b);
    expect(Project::find($project->id))->toBeNull();
    expect(Project::withoutGlobalScopes()->find($project->id))->toBeNull();
});

it('raw SQL returns 0 project rows for WS-A when context is WS-B', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Project::factory()->count(2)->create();

    setWorkspaceContext($b->id);
    expect(DB::table('projects')->where('workspace_id', $a->id)->count())->toBe(0);
});

// ─── Task isolation ───────────────────────────────────────────────────────────

it('isolates tasks across workspaces', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Task::factory()->count(5)->create();

    actingInWorkspace($b);
    Task::factory()->count(2)->create();

    actingInWorkspace($a);
    expect(Task::count())->toBe(5);

    actingInWorkspace($b);
    expect(Task::count())->toBe(2);
});

it('cannot resolve a cross-workspace task — scope AND RLS deny', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    $task = Task::factory()->create();

    actingInWorkspace($b);
    expect(Task::find($task->id))->toBeNull();
    expect(Task::withoutGlobalScopes()->find($task->id))->toBeNull();
});

it('raw SQL returns 0 task rows for WS-A when context is WS-B', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Task::factory()->count(3)->create();

    setWorkspaceContext($b->id);
    expect(DB::table('tasks')->where('workspace_id', $a->id)->count())->toBe(0);
});

// ─── Auto-stamp workspace_id on create ────────────────────────────────────────

it('auto-stamps workspace_id on Client from active workspace', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $client = Client::factory()->create();
    expect($client->workspace_id)->toBe($ws->id);
});

it('auto-stamps workspace_id on Project from active workspace', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $project = Project::factory()->create();
    expect($project->workspace_id)->toBe($ws->id);
});

it('auto-stamps workspace_id on Task from active workspace', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $task = Task::factory()->create();
    expect($task->workspace_id)->toBe($ws->id);
});
