<?php

namespace App\Agent\Contracts\Ports;

interface UnitOfWork
{
    /**
     * Chạy $work trong một transaction; ném lỗi thì không ghi gì.
     *
     * @template T
     *
     * @param  callable(): T  $work
     * @return T
     */
    public function run(callable $work): mixed;
}
