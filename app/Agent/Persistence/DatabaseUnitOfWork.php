<?php

namespace App\Agent\Persistence;

use App\Agent\Contracts\Ports\UnitOfWork;
use Illuminate\Support\Facades\DB;

final class DatabaseUnitOfWork implements UnitOfWork
{
    public function run(callable $work): mixed
    {
        return DB::transaction(fn () => $work());
    }
}
