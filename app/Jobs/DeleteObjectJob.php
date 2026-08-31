<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Queue\Queueable;

// Port từ refs/chatwoot/app/jobs/delete_object_job.rb (bỏ tham số user/message
// dùng cho webhook EE — chưa có listener nào cần tới).
class DeleteObjectJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Model $object)
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        $this->object->delete();
    }
}
