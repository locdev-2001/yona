<?php

namespace App\Agent\Kernel\Commands;

use App\Agent\Boundary\Evals\EvalConversations;
use App\Agent\Boundary\Evals\EvalShopSeeder;
use App\Agent\Evals\Comparison;
use App\Agent\Evals\EvalRunner;
use App\Agent\Evals\EvalShop;
use App\Agent\Evals\Judge;
use App\Agent\Evals\Outcome;
use App\Agent\Evals\ReportWriter;
use App\Agent\Evals\Scenario;
use App\Agent\Evals\ScenarioCatalog;
use App\Agent\Evals\ScenarioRun;
use App\Agent\Evals\Scorecard;
use App\Agent\Evals\ShopFixture;
use App\Agent\Evals\SimulatedCustomer;
use App\Agent\Evals\TurnPump;
use App\Agent\Runtime\TurnSettings;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Contracts\Process\InvokedProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use InvalidArgumentException;
use JsonException;
use Throwable;

// Bộ chấm hội thoại: chạy kịch bản trên shop mẫu bằng AI thật, khách giả + giám khảo, ghi
// report.md + results.json. Lượt AI chạy ngay trong tiến trình này qua hàng đợi riêng (xem
// TurnPump); --concurrency > 1 tách mỗi lần chạy kịch bản ra một tiến trình con.
final class EvalCommand extends Command
{
    private const OUTPUT_ROOT = 'app/agent-evals';

    private const CHILD_TIMEOUT_SECONDS = 1800;

    private const CHILD_POLL_MICROSECONDS = 500_000;

    protected $signature = 'agent:eval
        {--scenario=* : Chỉ chạy kịch bản có id này (lặp lại được)}
        {--repeat=1 : Số lần chạy mỗi kịch bản}
        {--concurrency=1 : Số kịch bản chạy song song (tiến trình con)}
        {--compare= : Thư mục (hoặc results.json) của vòng trước để in chênh lệch}
        {--output= : Thư mục ghi kết quả; mặc định storage/app/agent-evals/<thời điểm>}
        {--prune : Xoá mọi hội thoại eval cũ của shop mẫu rồi thoát}
        {--part= : (nội bộ) chạy đúng một lần một kịch bản, ghi kết quả JSON vào tệp này}
        {--repeat-index=1 : (nội bộ) lần chạy thứ mấy của kịch bản}';

    protected $description = 'Chấm hội thoại nhân viên AI trên shop mẫu bằng khách giả và giám khảo (gọi mô hình thật, tốn token)';

    public function handle(EvalShopSeeder $seeder, EvalConversations $conversations, ReportWriter $writer): int
    {
        if ($this->laravel->isProduction()) {
            $this->components->error('Bộ chấm chỉ chạy trên máy dev, từ chối chạy trên production.');

            return self::FAILURE;
        }

        try {
            $fixture = ShopFixture::fromFile();

            if ($this->option('prune')) {
                return $this->prune($seeder, $conversations, $fixture);
            }

            $scenarios = (new ScenarioCatalog)->select(array_values(array_map('strval', (array) $this->option('scenario'))));
            $repeat = $this->positiveOption('repeat');
            $concurrency = $this->positiveOption('concurrency');

            if (filled($this->option('part'))) {
                return $this->runPart($seeder, $fixture, $scenarios);
            }

            $previous = filled($this->option('compare')) ? $writer->readResults($this->resolveRunPath((string) $this->option('compare'))) : null;
            $shop = $seeder->seed($fixture);
        } catch (InvalidArgumentException $exception) {
            $this->components->error($exception->getMessage());

            return self::INVALID;
        }

        $startedAt = CarbonImmutable::now();
        $plan = $this->plan($scenarios, $repeat);
        $runs = $concurrency > 1 ? $this->runInChildren($plan, $concurrency) : $this->runHere($plan, $fixture, $shop);

        $scorecard = Scorecard::of($runs);
        $comparison = $previous === null ? null : Comparison::between($scorecard->toArray(), $previous['scorecard'], (string) ($previous['meta']['started_at'] ?? $this->option('compare')));
        $directory = filled($this->option('output')) ? (string) $this->option('output') : storage_path(self::OUTPUT_ROOT.'/'.$startedAt->format('Ymd-His'));
        $writer->write($directory, $this->meta($shop, $startedAt, count($scenarios), $repeat, $concurrency), $scorecard, $runs, $comparison);

        $this->summary($scorecard, $runs, $comparison, $directory);

        return self::SUCCESS;
    }

    /**
     * @param  list<Scenario>  $scenarios
     * @return list<array{0: Scenario, 1: int}>
     */
    private function plan(array $scenarios, int $repeat): array
    {
        $plan = [];

        foreach ($scenarios as $scenario) {
            for ($index = 1; $index <= $repeat; $index++) {
                $plan[] = [$scenario, $index];
            }
        }

        return $plan;
    }

    /**
     * @param  list<array{0: Scenario, 1: int}>  $plan
     * @return list<ScenarioRun>
     */
    private function runHere(array $plan, ShopFixture $fixture, EvalShop $shop): array
    {
        $pump = $this->turnPump();
        $runner = new EvalRunner($this->laravel->make(EvalConversations::class), $pump, $this->laravel->make(SimulatedCustomer::class), $this->laravel->make(Judge::class));
        $runs = [];

        try {
            foreach ($plan as $position => [$scenario, $repeatIndex]) {
                $this->components->task(sprintf('[%d/%d] %s (lần %d)', $position + 1, count($plan), $scenario->id, $repeatIndex), function () use (&$runs, $runner, $scenario, $fixture, $shop, $repeatIndex) {
                    $run = $runner->run($scenario, $fixture, $shop, $repeatIndex);
                    $runs[] = $run;

                    return $run->outcome !== Outcome::EvalError;
                });
            }
        } finally {
            $pump->clear();
        }

        return $runs;
    }

    /**
     * Lượt AI của tiến trình này đi qua một hàng đợi riêng (không worker Horizon nào nghe),
     * không cửa sổ im lặng, không trần chi phí ngày (giám khảo ghi cùng account vào api_logs).
     */
    private function turnPump(): TurnPump
    {
        $queue = 'agent-eval-'.getmypid().'-'.Str::lower(Str::random(6));

        config([
            'agent.turn.enabled' => true,
            'agent.turn.queue' => $queue,
            'agent.turn.debounce_seconds' => array_map(fn () => 0, (array) config('agent.turn.debounce_seconds')),
            'agent.turn.daily_budget_usd' => 0,
        ]);
        $this->laravel->forgetInstance(TurnSettings::class);

        return new TurnPump($this->laravel->make('queue.worker'), $this->laravel->make('queue'), null, $queue);
    }

    /** @param list<Scenario> $scenarios */
    private function runPart(EvalShopSeeder $seeder, ShopFixture $fixture, array $scenarios): int
    {
        if (count($scenarios) !== 1) {
            throw new InvalidArgumentException('--part needs exactly one --scenario.');
        }

        $shop = $seeder->find($fixture) ?? throw new InvalidArgumentException('The eval shop is not seeded yet: run agent:eval:seed.');
        $runs = $this->runHere([[$scenarios[0], $this->positiveOption('repeat-index')]], $fixture, $shop);

        file_put_contents((string) $this->option('part'), json_encode($runs[0]->toArray(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }

    /**
     * @param  list<array{0: Scenario, 1: int}>  $plan
     * @return list<ScenarioRun>
     */
    private function runInChildren(array $plan, int $concurrency): array
    {
        $partsDirectory = storage_path(self::OUTPUT_ROOT.'/.parts-'.getmypid());
        @mkdir($partsDirectory, 0775, true);
        $runs = [];
        /** @var array<int, array{process: InvokedProcess, file: string, scenario: Scenario, repeat: int}> $running */
        $running = [];
        $queue = $plan;
        $total = count($plan);

        while ($queue !== [] || $running !== []) {
            while ($queue !== [] && count($running) < $concurrency) {
                [$scenario, $repeatIndex] = array_shift($queue);
                $file = "{$partsDirectory}/{$scenario->id}-{$repeatIndex}.json";
                $running[] = [
                    'process' => Process::path(base_path())->timeout(self::CHILD_TIMEOUT_SECONDS)->start([
                        PHP_BINARY, 'artisan', 'agent:eval', "--scenario={$scenario->id}", "--repeat-index={$repeatIndex}", "--part={$file}",
                    ]),
                    'file' => $file,
                    'scenario' => $scenario,
                    'repeat' => $repeatIndex,
                ];
            }

            foreach ($running as $key => $child) {
                if ($child['process']->running()) {
                    continue;
                }

                $run = $this->readPart($child['file'], $child['scenario'], $child['repeat'], $child['process']->wait()->errorOutput());
                $runs[] = $run;
                unset($running[$key]);
                $this->components->twoColumnDetail(sprintf('[%d/%d] %s (lần %d)', count($runs), $total, $run->scenarioId, $run->repeat), $run->outcome->label());
            }

            usleep(self::CHILD_POLL_MICROSECONDS);
        }

        @rmdir($partsDirectory);

        // Giữ thứ tự của kế hoạch chạy để report ổn định giữa các vòng.
        $order = array_flip(array_map(fn (array $item) => "{$item[0]->id}#{$item[1]}", $plan));
        usort($runs, fn (ScenarioRun $a, ScenarioRun $b) => $order["{$a->scenarioId}#{$a->repeat}"] <=> $order["{$b->scenarioId}#{$b->repeat}"]);

        return $runs;
    }

    private function readPart(string $file, Scenario $scenario, int $repeat, string $errorOutput): ScenarioRun
    {
        try {
            $raw = is_file($file) ? json_decode((string) file_get_contents($file), true, 64, JSON_THROW_ON_ERROR) : null;
        } catch (JsonException) {
            $raw = null;
        }

        @unlink($file);

        return is_array($raw)
            ? ScenarioRun::fromArray($raw)
            : new ScenarioRun($scenario->id, $scenario->title, $repeat, null, null, Outcome::EvalError, [], [], 0, 0, 0, null, 'Child process failed: '.Str::limit(trim($errorOutput), 500));
    }

    private function prune(EvalShopSeeder $seeder, EvalConversations $conversations, ShopFixture $fixture): int
    {
        $shop = $seeder->find($fixture);

        if ($shop === null) {
            $this->components->info('Chưa có shop mẫu, không có gì để xoá.');

            return self::SUCCESS;
        }

        $removed = $conversations->purge($shop);
        $this->components->info("Đã xoá {$removed} hội thoại eval của account #{$shop->accountId}.");

        return self::SUCCESS;
    }

    private function resolveRunPath(string $path): string
    {
        return file_exists($path) ? $path : storage_path(self::OUTPUT_ROOT.'/'.ltrim($path, '/'));
    }

    private function positiveOption(string $name): int
    {
        $value = $this->option($name);

        if (! is_numeric($value) || (int) $value < 1) {
            throw new InvalidArgumentException("--{$name} must be a positive integer.");
        }

        return (int) $value;
    }

    /** @return array<string, mixed> */
    private function meta(EvalShop $shop, CarbonImmutable $startedAt, int $scenarioCount, int $repeat, int $concurrency): array
    {
        $aiAlias = (string) (config("agent.agent_models.{$shop->aiAgentId}") ?? config('agent.default_model'));

        return [
            'started_at' => $startedAt->toIso8601String(),
            'finished_at' => CarbonImmutable::now()->toIso8601String(),
            'commit' => $this->commit(),
            'account_id' => $shop->accountId,
            'ai_agent_id' => $shop->aiAgentId,
            'scenarios' => $scenarioCount,
            'repeat' => $repeat,
            'concurrency' => $concurrency,
            'models' => [
                'ai' => $this->modelOf($aiAlias),
                'customer' => $this->modelOf('eval_customer'),
                'judge' => $this->modelOf('eval_judge'),
            ],
        ];
    }

    private function modelOf(string $alias): string
    {
        $route = (array) config("agent.models.{$alias}.routes.0", []);

        return isset($route['provider'], $route['model']) ? "{$alias} → {$route['provider']}/{$route['model']}" : $alias;
    }

    private function commit(): string
    {
        try {
            $result = Process::path(base_path())->run(['git', 'rev-parse', '--short', 'HEAD']);
        } catch (Throwable) {
            return '?';
        }

        return $result->successful() ? trim($result->output()) : '?';
    }

    /** @param list<ScenarioRun> $runs */
    private function summary(Scorecard $scorecard, array $runs, ?Comparison $comparison, string $directory): void
    {
        $this->newLine();
        $this->table(
            ['Kịch bản', 'Lần', 'Kết thúc', 'TB', 'Tiêu chí riêng', 'Hội thoại'],
            array_map(fn (ScenarioRun $run) => [
                $run->scenarioId,
                $run->repeat,
                $run->outcome->label(),
                $run->verdict?->averageScore() === null ? '—' : number_format((float) $run->verdict->averageScore(), 2),
                $run->verdict === null ? ($run->error ?? '—') : count(array_filter($run->verdict->criteria, fn ($criterion) => $criterion->passed)).'/'.count($run->verdict->criteria),
                $run->displayId === null ? '—' : "#{$run->displayId}",
            ], $runs),
        );

        $this->components->twoColumnDetail('Điểm trung bình chung', $scorecard->overallMean === null ? '—' : number_format($scorecard->overallMean, 2).'/5');
        $this->components->twoColumnDetail('Tiêu chí riêng đạt', "{$scorecard->criteriaPassed}/{$scorecard->criteriaTotal}");
        $this->components->twoColumnDetail('Chi phí AI / bộ chấm', sprintf('$%.4f / $%.4f', $scorecard->aiCostMicroUsd / 1_000_000, $scorecard->evalCostMicroUsd / 1_000_000));
        $this->components->twoColumnDetail('Độ trễ trung bình mỗi lượt', $scorecard->averageTurnLatencyMs === null ? '—' : number_format($scorecard->averageTurnLatencyMs / 1000, 1).'s');

        foreach ($comparison === null ? [] : $comparison->metrics as $metric) {
            $delta = Comparison::delta($metric['previous'], $metric['current']);
            $this->components->twoColumnDetail("Δ {$metric['label']}", $delta === null ? '—' : sprintf('%+.2f', $delta));
        }

        $this->components->info("Report: {$directory}/".ReportWriter::REPORT_FILE);
    }
}
