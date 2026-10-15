<?php

namespace App\Agent\Kernel\Commands;

use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolSpec;
use DateTimeImmutable;
use Illuminate\Console\Command;

// Gửi một prompt nhỏ có một công cụ qua đúng tuyến của alias để kiểm khoá và tuyến.
// Gọi API thật, tốn token: chỉ chạy tay sau khi đặt khoá vào .env.
final class ModelPingCommand extends Command
{
    private const DEADLINE_SECONDS = 60;

    private const CACHE_KEY = 'agent-model-ping';

    protected $signature = 'agent:model:ping
        {alias? : Alias mô hình trong config/agent.php; bỏ trống = default_model}
        {--account=1 : Account ghi vào api_logs}';

    protected $description = 'Gọi thử một alias mô hình (một công cụ), in tuyến đã dùng, lý do dừng và số token';

    public function handle(LanguageModel $model): int
    {
        $accountId = (int) $this->option('account');

        if ($accountId <= 0) {
            $this->error('--account phải là id account dương.');

            return self::INVALID;
        }

        $alias = $this->argument('alias');
        $response = $model->complete(new ModelRequest(
            accountId: $accountId,
            prompt: $this->prompt(),
            deadline: new DateTimeImmutable('+'.self::DEADLINE_SECONDS.' seconds'),
            cacheKey: self::CACHE_KEY,
            modelAlias: is_string($alias) && $alias !== '' ? $alias : null,
        ));

        $usage = $response->usage;
        $this->table(['Trường', 'Giá trị'], [
            ['Tuyến', $response->route ? "{$response->route->provider} / {$response->route->model}" : '(không có)'],
            ['FinishReason', $response->finishReason->value],
            ['Công cụ được gọi', implode(', ', array_map(fn ($call) => $call->name, $response->toolCalls())) ?: '(không)'],
            ['Token vào (không cache)', $usage->inputTokens],
            ['Token ra', $usage->outputTokens],
            ['Token đọc cache', $usage->cacheReadTokens],
            ['Token ghi cache', $usage->cacheWriteTokens],
            ['Chi phí (micro-USD)', $usage->costMicroUsd],
            ['Độ trễ (ms)', $usage->latencyMs],
            ['Lý do trượt cache', $usage->cacheMissReason ?? '-'],
        ]);

        if ($response->error !== null) {
            $this->error("Lỗi {$response->error->kind->value}: {$response->error->message}");

            return self::FAILURE;
        }

        return $response->finishReason === FinishReason::ToolUse ? self::SUCCESS : self::FAILURE;
    }

    private function prompt(): Prompt
    {
        return new Prompt(
            system: [new SystemBlock('You are a connectivity check. Call the report_status tool with status "ok" and nothing else.')],
            tools: [new ToolSpec(
                'report_status',
                'Report that the model gateway works.',
                ['type' => 'object', 'properties' => ['status' => ['type' => 'string']], 'required' => ['status']],
                ToolKind::Terminal,
            )],
            messages: [new PromptMessage(MessageRole::User, [new TextBlock('Ping.')])],
        );
    }
}
