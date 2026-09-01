<?php

namespace App\Jobs;

use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/jobs/delete_object_job.rb (bỏ tham số user/message
// dùng cho webhook EE — chưa có listener nào cần tới).
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
