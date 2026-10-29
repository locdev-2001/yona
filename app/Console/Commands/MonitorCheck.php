<?php

namespace App\Console\Commands;

use App\Services\MessengerPersonal\BridgeClient as MessengerBridgeClient;
use App\Support\Alerts\OpsAlerter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Throwable;

/**
 * Chạy mỗi phút (routes/console.php). Chỉ cảnh báo khi một tiến trình ĐỔI
 * trạng thái (down→up hoặc up→down) — trạng thái lưu ở cache, không phải mỗi
 * phút.
 *
 * Đây là lớp cảnh báo chủ động thay cho việc Horizon "chỉ hiển thị" — vẫn cần
 * một external uptime monitor bắn vào `https://yona.vn/up` độc lập với server
 * này, vì lệnh này chết theo cùng scheduler nếu cả máy chủ sập
 * (docs/deployment.md mục "Cảnh báo vận hành").
 */
class MonitorCheck extends Command
{
    protected $signature = 'monitor:check';

    protected $description = 'Kiểm tra Horizon, Reverb, zalo-bridge, messenger-bridge mỗi phút và cảnh báo khi đổi trạng thái';

    public function __construct(
        private readonly OpsAlerter $alerter,
        private readonly MessengerBridgeClient $messengerBridge,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->checkHorizon();
        $this->checkReverb();
        $this->checkZaloBridge();
        $this->checkMessengerBridge();

        return self::SUCCESS;
    }

    private function checkHorizon(): void
    {
        $healthy = $this->horizonIsRunning();
        $this->reportTransition(
            'horizon',
            $healthy,
            'Horizon không chạy — hàng đợi không được xử lý.',
            'Horizon đã chạy lại.',
        );
    }

    private function horizonIsRunning(): bool
    {
        try {
            $masters = app(MasterSupervisorRepository::class)->all();
        } catch (Throwable) {
            return false;
        }

        if (empty($masters)) {
            return false;
        }

        return ! collect($masters)->contains(fn ($master) => $master->status === 'paused');
    }

    private function checkReverb(): void
    {
        $healthy = $this->reverbPortReachable();
        $this->reportTransition(
            'reverb',
            $healthy,
            'Reverb không mở cổng — realtime hộp thư ngừng hoạt động.',
            'Reverb đã mở cổng lại.',
        );
    }

    private function reverbPortReachable(): bool
    {
        $host = (string) config('reverb.servers.reverb.host');
        $host = ($host === '' || $host === '0.0.0.0') ? '127.0.0.1' : $host;
        $port = (int) config('reverb.servers.reverb.port');

        $connection = @fsockopen($host, $port, $errorCode, $errorMessage, 5);
        if ($connection === false) {
            return false;
        }

        fclose($connection);

        return true;
    }

    private function checkZaloBridge(): void
    {
        $healthy = $this->zaloBridgeReachable();
        $this->reportTransition(
            'zalo-bridge',
            $healthy,
            'zalo-bridge không phản hồi — tin Zalo không gửi/nhận được.',
            'zalo-bridge đã phản hồi trở lại.',
        );
    }

    private function zaloBridgeReachable(): bool
    {
        try {
            Http::timeout(5)->get((string) config('zalo.bridge.url'));

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    // Máy chủ chưa cấu hình sidecar Messenger thì không giám sát: chưa triển khai không phải sự cố.
    private function checkMessengerBridge(): void
    {
        if (! $this->messengerBridge->isConfigured()) {
            return;
        }

        $this->reportTransition(
            'messenger-bridge',
            $this->messengerBridge->ping() !== null,
            'messenger-bridge không phản hồi — tin Messenger cá nhân không gửi/nhận được.',
            'messenger-bridge đã phản hồi trở lại.',
        );
    }

    private function reportTransition(string $check, bool $healthy, string $downMessage, string $upMessage): void
    {
        $stateKey = "monitor:state:{$check}";
        $previous = Cache::get($stateKey);

        Cache::put($stateKey, $healthy, now()->addDays(7));

        if ($previous === $healthy) {
            return;
        }

        // null->true (lần chạy đầu tiên đã khoẻ) không phải là một lần hồi phục
        // đáng báo — chỉ ghi nhận baseline.
        if ($previous === null && $healthy) {
            return;
        }

        $this->alerter->send(
            "monitor:{$check}:".($healthy ? 'up' : 'down'),
            $healthy ? $upMessage : $downMessage,
        );
    }
}
