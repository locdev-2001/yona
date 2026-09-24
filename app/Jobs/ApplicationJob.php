<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

// Lớp nền cho mọi job.
// `discard_on ActiveJob::DeserializationError` của Rails = model trong payload
// đã bị xóa trước khi job chạy thì bỏ job trong im lặng, không rơi vào
// failed_jobs; idiom Laravel là $deleteWhenMissingModels (SerializesModels
// nằm trong trait Queueable của Laravel 12).
abstract class ApplicationJob implements ShouldQueue
{
    use Queueable;

    public bool $deleteWhenMissingModels = true;
}
