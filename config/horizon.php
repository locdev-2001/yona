<?php

use App\Http\Middleware\EnsureOperationsDashboardAccess;
use Illuminate\Support\Str;

// Thứ tự tier là nguồn duy nhất ở config/queue_tiers.php — Makefile và
// deploy.sh đọc lại chính file đó, không chép tay lần hai.
$tiers = require __DIR__.'/queue_tiers.php';

return [

    /*
    |--------------------------------------------------------------------------
    | Horizon Name
    |--------------------------------------------------------------------------
    |
    | This name appears in notifications and in the Horizon UI. Unique names
    | can be useful while running multiple instances of Horizon within an
    | application, allowing you to identify the Horizon you're viewing.
    |
    */

    'name' => env('HORIZON_NAME'),

    /*
    |--------------------------------------------------------------------------
    | Horizon Domain
    |--------------------------------------------------------------------------
    |
    | This is the subdomain where Horizon will be accessible from. If this
    | setting is null, Horizon will reside under the same domain as the
    | application. Otherwise, this value will serve as the subdomain.
    |
    */

    'domain' => env('HORIZON_DOMAIN'),

    /*
    |--------------------------------------------------------------------------
    | Horizon Path
    |--------------------------------------------------------------------------
    |
    | This is the URI path where Horizon will be accessible from. Feel free
    | to change this path to anything you like. Note that the URI will not
    | affect the paths of its internal API that aren't exposed to users.
    |
    */

    'path' => env('HORIZON_PATH', 'horizon'),

    /*
    |--------------------------------------------------------------------------
    | Horizon Redis Connection
    |--------------------------------------------------------------------------
    |
    | This is the name of the Redis connection where Horizon will store the
    | meta information required for it to function. It includes the list
    | of supervisors, failed jobs, job metrics, and other information.
    |
    */

    'use' => 'default',

    /*
    |--------------------------------------------------------------------------
    | Horizon Redis Prefix
    |--------------------------------------------------------------------------
    |
    | This prefix will be used when storing all Horizon data in Redis. You
    | may modify the prefix when you are running multiple installations
    | of Horizon on the same server so that they don't have problems.
    |
    */

    'prefix' => env(
        'HORIZON_PREFIX',
        Str::slug(env('APP_NAME', 'laravel'), '_').'_horizon:'
    ),

    /*
    |--------------------------------------------------------------------------
    | Horizon Route Middleware
    |--------------------------------------------------------------------------
    |
    | These middleware will get attached onto each Horizon route, giving you
    | the chance to add your own middleware to this list or change any of
    | the existing middleware. Or, you can simply stick with this list.
    |
    */

    // Horizon mặc định chỉ chặn bằng gate `viewHorizon` ngoài môi trường
    // local. Dashboard này đọc được payload job (có số điện thoại, nội dung
    // tin nhắn khách) nên chặn thẳng bằng cửa chung của dashboard vận hành:
    // super admin (bắt buộc 2FA) hoặc user có email trong YONA_SYSTEM_ADMIN_EMAILS.
    'middleware' => ['web', EnsureOperationsDashboardAccess::class],

    /*
    |--------------------------------------------------------------------------
    | Queue Wait Time Thresholds
    |--------------------------------------------------------------------------
    |
    | This option allows you to configure when the LongWaitDetected event
    | will be fired. Every connection / queue combination may have its
    | own, unique threshold (in seconds) before this event is fired.
    |
    */

    // AlertOnLongWaitDetected (AppServiceProvider) tiêu thụ sự kiện này — mỗi
    // tier hàng đợi cần một ngưỡng riêng ở đây, thiếu tier nào thì tier đó
    // không bao giờ được cảnh báo dù nghẽn thật.
    'waits' => [
        'redis:default' => 60,
        'redis:critical' => 30,
        'redis:media' => 120,
    ],

    /*
    |--------------------------------------------------------------------------
    | Job Trimming Times
    |--------------------------------------------------------------------------
    |
    | Here you can configure for how long (in minutes) you desire Horizon to
    | persist the recent and failed jobs. Typically, recent jobs are kept
    | for one hour while all failed jobs are stored for an entire week.
    |
    */

    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],

    /*
    |--------------------------------------------------------------------------
    | Silenced Jobs
    |--------------------------------------------------------------------------
    |
    | Silencing a job will instruct Horizon to not place the job in the list
    | of completed jobs within the Horizon dashboard. This setting may be
    | used to fully remove any noisy jobs from the completed jobs list.
    |
    */

    'silenced' => [
        // App\Jobs\ExampleJob::class,
    ],

    'silenced_tags' => [
        // 'notifications',
    ],

    /*
    |--------------------------------------------------------------------------
    | Metrics
    |--------------------------------------------------------------------------
    |
    | Here you can configure how many snapshots should be kept to display in
    | the metrics graph. This will get used in combination with Horizon's
    | `horizon:snapshot` schedule to define how long to retain metrics.
    |
    */

    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,
            'queue' => 24,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fast Termination
    |--------------------------------------------------------------------------
    |
    | When this option is enabled, Horizon's "terminate" command will not
    | wait on all of the workers to terminate unless the --wait option
    | is provided. Fast termination can shorten deployment delay by
    | allowing a new instance of Horizon to start while the last
    | instance will continue to terminate each of its workers.
    |
    */

    'fast_termination' => false,

    /*
    |--------------------------------------------------------------------------
    | Memory Limit (MB)
    |--------------------------------------------------------------------------
    |
    | This value describes the maximum amount of memory the Horizon master
    | supervisor may consume before it is terminated and restarted. For
    | configuring these limits on your workers, see the next section.
    |
    */

    'memory_limit' => 64,

    /*
    |--------------------------------------------------------------------------
    | Queue Worker Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may define the queue worker settings used by your application
    | in all environments. These supervisors and settings handle all your
    | queued jobs and will be provisioned by Horizon during deployment.
    |
    */

    // Ba nhóm worker cố định, mỗi nhóm một supervisor, để việc dài không chiếm
    // chỗ của việc người dùng đang nhìn:
    // - realtime: chỉ tier critical (phát realtime, tắt "đang nhập…"), luôn có
    //   process rảnh dù mọi worker khác đang gửi tệp hay tải ảnh.
    // - supervisor-1: mọi tier còn lại theo đúng thứ tự, critical đứng đầu để
    //   worker thường cũng đỡ phát realtime khi dồn. `balance => false` giữ ưu
    //   tiên tuyệt đối từ trên xuống; bật balance là chia process theo hàng đợi.
    // - media: tin có tệp (tới 120s mỗi lượt gửi Zalo) — không bao giờ giữ worker
    //   của tin chữ, thông báo hay sự kiện Zalo đến.
    // minProcesses = maxProcesses: với balance tắt, Horizon hạ pool về
    // minProcesses (mặc định 1) khi hàng đợi rỗng rồi chỉ thêm MỘT process mỗi 3
    // giây khi có việc, và process mới chạy việc đầu tiên chậm vì nạp lại toàn bộ
    // mã. Pool cố định thì worker luôn ấm và đủ ngay từ việc đầu.
    // maxTime = 0: không tự khởi động lại theo giờ. PHP CLI không có opcache nên mỗi
    // worker mới biên dịch lại từng đường code lần đầu gặp (~1s CPU cho 100–200 tệp
    // trên production); worker chỉ dùng 10–20MB nên giới hạn `memory` đủ để thay
    // tiến trình khi rò bộ nhớ, deploy thì `horizon:terminate` thay toàn bộ.
    'defaults' => [
        'supervisor-realtime' => [
            'connection' => 'redis',
            'queue' => ['critical'],
            'balance' => false,
            'minProcesses' => 1,
            'maxProcesses' => 1,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 256,
            'tries' => 3,
            'timeout' => 60,
            'nice' => 0,
        ],

        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => array_values(array_diff($tiers, ['media'])),
            'balance' => false,
            'autoScalingStrategy' => 'time',
            'minProcesses' => 1,
            'maxProcesses' => 1,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 256,
            'tries' => 3,
            // Bất biến: media_timeout kênh (120s) < timeout worker (150s)
            // < retry_after của Redis (180s, config/queue.php). Sai thứ tự thì
            // Redis trả job về hàng đợi trong lúc worker vẫn đang chạy nó.
            'timeout' => 150,
            'nice' => 0,
        ],

        'supervisor-media' => [
            'connection' => 'redis',
            'queue' => ['media'],
            'balance' => false,
            'minProcesses' => 1,
            'maxProcesses' => 1,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 256,
            'tries' => 3,
            'timeout' => 150,
            'nice' => 0,
        ],

        // Render sticker ăn CPU và tới 384MB mỗi lượt (prlimit): tách khỏi các tier
        // tin nhắn, đúng một process để upload dồn dập không làm chậm việc gửi tin.
        'supervisor-stickers' => [
            'connection' => 'redis',
            'queue' => ['stickers'],
            'balance' => false,
            'maxProcesses' => 1,
            'maxTime' => 0,
            'maxJobs' => 0,
            'memory' => 256,
            'tries' => 1,
            'timeout' => 150,
            'nice' => 0,
        ],
    ],

    'environments' => [
        'production' => [
            'supervisor-realtime' => [
                'minProcesses' => $realtimeProcesses = max(1, (int) env('HORIZON_REALTIME_PROCESSES', 2)),
                'maxProcesses' => $realtimeProcesses,
            ],
            'supervisor-1' => [
                'minProcesses' => $generalProcesses = max(1, (int) env('HORIZON_MAX_PROCESSES', 4)),
                'maxProcesses' => $generalProcesses,
            ],
            'supervisor-media' => [
                'minProcesses' => $mediaProcesses = max(1, (int) env('HORIZON_MEDIA_PROCESSES', 2)),
                'maxProcesses' => $mediaProcesses,
            ],
        ],

        'local' => [
            'supervisor-1' => [
                'minProcesses' => 2,
                'maxProcesses' => 2,
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | File Watcher Configuration
    |--------------------------------------------------------------------------
    |
    | The following list of directories and files will be watched when using
    | the `horizon:listen` command. Whenever any directories or files are
    | changed, Horizon will automatically restart to apply all changes.
    |
    */

    'watch' => [
        'app',
        'bootstrap',
        'config/**/*.php',
        'database/**/*.php',
        'public/**/*.php',
        'resources/**/*.php',
        'routes',
        'composer.lock',
        'composer.json',
        '.env',
    ],
];
