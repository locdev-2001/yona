<?php

namespace App\Support\Logging;

use Opcodes\LogViewer\Logs\Log;

/**
 * Log stdout/stderr của PM2, Supervisor và các service nội bộ.
 *
 * Các file này không có envelope Monolog; mỗi dòng là một entry độc lập, có
 * thể bắt đầu bằng timestamp và level. Regex vẫn nhận dòng không có prefix để
 * Log Viewer hiển thị đầy đủ stack trace/output thay vì ẩn file "unknown".
 */
class ServiceProcessLog extends Log
{
    public static string $name = 'Service process';

    public static string $regex = '/^(?:(?P<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}):?\s*)?(?:(?P<level>TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|CRITICAL|ALERT|EMERGENCY)\s+)?(?P<message>\S.*)$/i';
}
