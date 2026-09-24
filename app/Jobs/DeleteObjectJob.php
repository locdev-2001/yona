<?php

namespace App\Jobs;

use Illuminate\Database\Eloquent\Model;

// Không nhận tham số user/message: chưa có listener nào cần tới.
class DeleteObjectJob extends ApplicationJob
{
    public function __construct(private readonly Model $object)
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        $this->object->delete();
    }
}
