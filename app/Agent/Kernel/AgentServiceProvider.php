<?php

namespace App\Agent\Kernel;

use App\Agent\Boundary\Writers\ApiLogWriter;
use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Inference\Gateway\ModelRouter;
use App\Agent\Inference\Gateway\RouteTable;
use App\Agent\Kernel\Commands\ModelPingCommand;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;
use Psr\Log\LoggerInterface;

// Composition root của nhân viên AI: nơi duy nhất gắn hiện thực vào Port
// (App\Agent\Contracts) và đăng ký công cụ, lệnh agent:*. Lõi chỉ biết lớp này qua
// đúng một dòng trong bootstrap/providers.php; không lớp nào khác dùng Kernel.
final class AgentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->registerModelGateway();
        $this->app->bind(ApiCallLog::class, ApiLogWriter::class);
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([ModelPingCommand::class]);
        }
    }

    private function registerModelGateway(): void
    {
        $this->app->bind(RouteTable::class, fn (Application $app) => new RouteTable(
            (array) config('agent.providers', []),
            (array) config('agent.models', []),
            (string) config('agent.default_model', ''),
            (array) config('agent.agent_models', []),
            $app->make(LoggerInterface::class),
        ));

        $this->app->bind(LanguageModel::class, ModelRouter::class);
    }
}
