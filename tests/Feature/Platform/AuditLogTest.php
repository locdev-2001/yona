<?php

use App\Models\AuditLog;
use App\Models\Workspace;
use App\Services\TeamService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Append-only audit (BR-X05). PII minimization (BR-X07) is exercised when a
// PII-bearing entity (Contact) lands; the mechanism (auditPiiAttributes) is in
// place. Module-1 audited entities (Team, WorkspaceMember) carry no person PII.

beforeEach(function () {
    $this->ws = Workspace::factory()->create();
    actingInWorkspace($this->ws);
    $this->svc = app(TeamService::class);
});

it('records a create entry with attributes', function () {
    $team = $this->svc->create('Root');

    $entry = AuditLog::where('entity_id', $team->id)->where('action', 'create')->first();

    expect($entry)->not->toBeNull()
        ->and($entry->workspace_id)->toBe($this->ws->id)
        ->and($entry->changes)->toHaveKey('name')
        ->and($entry->changes['name'])->toBe('Root');
});

it('records an update entry with an old→new diff', function () {
    $team = $this->svc->create('Root');
    $team->name = 'Renamed';
    $team->save();

    $entry = AuditLog::where('entity_id', $team->id)->where('action', 'update')->latest('occurred_at')->first();

    expect($entry->changes)->toHaveKey('name')
        ->and($entry->changes['name']['old'])->toBe('Root')
        ->and($entry->changes['name']['new'])->toBe('Renamed');
});

it('blocks updating or deleting an audit entry at the application layer', function () {
    $team = $this->svc->create('Root');
    $entry = AuditLog::where('entity_id', $team->id)->first();

    $entry->action = 'tampered';
    expect(fn () => $entry->save())->toThrow(RuntimeException::class)
        ->and(fn () => $entry->delete())->toThrow(RuntimeException::class);
});

it('forbids raw UPDATE/DELETE on audit_logs at the database grant level', function () {
    $team = $this->svc->create('Root');
    $id = AuditLog::where('entity_id', $team->id)->value('id');

    expect(fn () => DB::table('audit_logs')->where('id', $id)->update(['action' => 'x']))
        ->toThrow(QueryException::class)
        ->and(fn () => DB::table('audit_logs')->where('id', $id)->delete())
        ->toThrow(QueryException::class);
});
