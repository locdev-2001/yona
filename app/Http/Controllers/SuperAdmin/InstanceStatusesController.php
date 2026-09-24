<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class InstanceStatusesController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('superadmin/InstanceStatus', ['metrics' => $this->metrics()]);
    }

    private function metrics(): array
    {
        return [
            ...$this->applicationMetrics(),
            ...$this->redisMetrics(),
        ];
    }

    private function applicationMetrics(): array
    {
        $pendingMigrations = collect(app('migrator')->getMigrationFiles(app('migrator')->paths() ?: [database_path('migrations')]))
            ->keys()
            ->diff(app('migrator')->getRepository()->getRan())
            ->isNotEmpty();

        return [
            'Yona version' => config('yona.version', 'dev'),
            'Postgres alive' => $this->postgresAlive() ? 'true' : 'false',
            'Database Migrations' => $pendingMigrations ? 'pending' : 'completed',
        ];
    }

    private function postgresAlive(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function redisMetrics(): array
    {
        try {
            $info = Redis::connection()->client()->info();
        } catch (Throwable) {
            return ['Redis alive' => 'false'];
        }

        return [
            'Redis alive' => 'true',
            'Redis version' => $info['redis_version'] ?? null,
            'Redis number of connected clients' => $info['connected_clients'] ?? null,
            'Redis memory used' => $info['used_memory_human'] ?? null,
            'Redis memory peak' => $info['used_memory_peak_human'] ?? null,
            "Redis 'maxmemory' setting" => $info['maxmemory'] ?? null,
            "Redis 'maxmemory_policy' setting" => $info['maxmemory_policy'] ?? null,
        ];
    }
}
