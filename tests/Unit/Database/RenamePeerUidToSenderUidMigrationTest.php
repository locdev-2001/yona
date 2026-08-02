<?php

use Illuminate\Database\Connection;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

function renamePeerUidMigration(): object
{
    return require database_path('migrations/2026_07_26_100004_rename_peer_uid_to_sender_uid.php');
}

it('skips the column rename for a fresh schema that already has sender_uid', function () {
    $schema = Mockery::mock(Builder::class);
    $schema->shouldReceive('hasColumn')->once()->with('conversations', 'peer_uid')->andReturnFalse();
    $schema->shouldReceive('hasColumn')->once()->with('conversations', 'sender_uid')->andReturnTrue();

    $connection = Mockery::mock(Connection::class);
    $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schema);
    $connection->shouldReceive('statement')
        ->once()
        ->with(Mockery::on(fn (string $sql): bool => str_contains(
            $sql,
            'RENAME TO conversations_channel_account_sender_unique'
        )))
        ->andReturnTrue();

    DB::shouldReceive('connection')->once()->with('pgsql_privileged')->andReturn($connection);

    renamePeerUidMigration()->up();
});

it('renames peer_uid when upgrading a legacy schema', function () {
    $schema = Mockery::mock(Builder::class);
    $schema->shouldReceive('hasColumn')->once()->with('conversations', 'peer_uid')->andReturnTrue();
    $schema->shouldReceive('hasColumn')->once()->with('conversations', 'sender_uid')->andReturnFalse();

    $connection = Mockery::mock(Connection::class);
    $connection->shouldReceive('getSchemaBuilder')->once()->andReturn($schema);
    $connection->shouldReceive('statement')
        ->once()
        ->with('ALTER TABLE conversations RENAME COLUMN peer_uid TO sender_uid')
        ->andReturnTrue();
    $connection->shouldReceive('statement')
        ->once()
        ->with(Mockery::on(fn (string $sql): bool => str_contains(
            $sql,
            'RENAME TO conversations_channel_account_sender_unique'
        )))
        ->andReturnTrue();

    DB::shouldReceive('connection')->once()->with('pgsql_privileged')->andReturn($connection);

    renamePeerUidMigration()->up();
});
