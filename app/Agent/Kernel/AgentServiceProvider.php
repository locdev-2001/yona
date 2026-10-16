<?php

namespace App\Agent\Kernel;

use App\Agent\Boundary\Inbound\InboundServiceProvider;
use App\Agent\Boundary\Readers\ApiLogModelSpend;
use App\Agent\Boundary\Readers\CoreAiAgentDirectory;
use App\Agent\Boundary\Readers\CoreConversationReader;
use App\Agent\Boundary\Readers\CoreCustomerProfileReader;
use App\Agent\Boundary\Readers\CoreKnowledgeReader;
use App\Agent\Boundary\Readers\CoreProductCatalog;
use App\Agent\Boundary\Writers\ApiLogWriter;
use App\Agent\Boundary\Writers\CoreConversationActionWriter;
use App\Agent\Boundary\Writers\CoreConversationFloor;
use App\Agent\Boundary\Writers\CoreCustomerProfileWriter;
use App\Agent\Boundary\Writers\UsageAnalyticsWriter;
use App\Agent\Contracts\Ports\AiAgentDirectory;
use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\ConversationFloor;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\Contracts\Ports\CustomerProfileReader;
use App\Agent\Contracts\Ports\CustomerProfileWriter;
use App\Agent\Contracts\Ports\EphemeralStore;
use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\Contracts\Ports\ModelSpend;
use App\Agent\Contracts\Ports\ProductCatalog;
use App\Agent\Contracts\Ports\StimulusSink;
use App\Agent\Contracts\Ports\UnitOfWork;
use App\Agent\Contracts\Ports\UsageMeter;
use App\Agent\Inference\Gateway\ModelRouter;
use App\Agent\Inference\Gateway\RouteTable;
use App\Agent\Kernel\Commands\EvalCommand;
use App\Agent\Kernel\Commands\EvalSeedCommand;
use App\Agent\Kernel\Commands\ModelPingCommand;
use App\Agent\Persistence\CacheEphemeralStore;
use App\Agent\Persistence\DatabaseUnitOfWork;
use App\Agent\Runtime\Jobs\RunTurnJob;
use App\Agent\Runtime\StimulusRouter;
use App\Agent\Runtime\TurnFailureHandler;
use App\Agent\Runtime\TurnOrder;
use App\Agent\Runtime\TurnSettings;
use App\Agent\Tools\Conversation\AddPrivateNoteTool;
use App\Agent\Tools\Conversation\SendBankTransferTool;
use App\Agent\Tools\Conversation\SendProductCardTool;
use App\Agent\Tools\Conversation\SendQuickRepliesTool;
use App\Agent\Tools\Conversation\TagConversationTool;
use App\Agent\Tools\Customer\GetCustomerProfileTool;
use App\Agent\Tools\Customer\SaveCustomerInfoTool;
use App\Agent\Tools\Knowledge\SearchKnowledgeTool;
use App\Agent\Tools\Knowledge\SearchProductsTool;
use App\Agent\Tools\Runner\Registry;
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
        $this->app->bind(UsageMeter::class, UsageAnalyticsWriter::class);
        $this->registerTurnRuntime();
    }

    public function boot(): void
    {
        RunTurnJob::handleFailuresWith(fn (TurnOrder $order, string $jobKey) => $this->app->make(TurnFailureHandler::class)->handle($order, $jobKey));

        if ($this->app->runningInConsole()) {
            $this->commands([ModelPingCommand::class, EvalCommand::class, EvalSeedCommand::class]);
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

    // Vòng lượt: Port lõi → Boundary, kích thích → Runtime, công cụ đọc và hành động đăng ký ở đây.
    private function registerTurnRuntime(): void
    {
        $this->app->register(InboundServiceProvider::class);

        $this->app->singleton(TurnSettings::class, fn () => TurnSettings::fromConfig((array) config('agent.turn')));

        $this->app->bind(ConversationReader::class, CoreConversationReader::class);
        $this->app->bind(KnowledgeReader::class, CoreKnowledgeReader::class);
        $this->app->bind(ProductCatalog::class, CoreProductCatalog::class);
        $this->app->bind(CustomerProfileReader::class, CoreCustomerProfileReader::class);
        $this->app->bind(CustomerProfileWriter::class, CoreCustomerProfileWriter::class);
        $this->app->bind(AiAgentDirectory::class, CoreAiAgentDirectory::class);
        $this->app->bind(ModelSpend::class, ApiLogModelSpend::class);
        $this->app->bind(ConversationActionWriter::class, CoreConversationActionWriter::class);
        $this->app->bind(ConversationFloor::class, CoreConversationFloor::class);
        $this->app->bind(UnitOfWork::class, DatabaseUnitOfWork::class);
        $this->app->bind(EphemeralStore::class, CacheEphemeralStore::class);
        $this->app->bind(StimulusSink::class, StimulusRouter::class);

        $this->app->bind(Registry::class, fn (Application $app) => new Registry(array_map(fn (string $tool) => $app->make($tool), [
            SearchKnowledgeTool::class,
            SearchProductsTool::class,
            GetCustomerProfileTool::class,
            SendProductCardTool::class,
            SendQuickRepliesTool::class,
            SendBankTransferTool::class,
            SaveCustomerInfoTool::class,
            TagConversationTool::class,
            AddPrivateNoteTool::class,
        ])));
    }
}
