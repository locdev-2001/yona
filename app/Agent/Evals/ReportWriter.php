<?php

namespace App\Agent\Evals;

use Illuminate\Filesystem\Filesystem;
use InvalidArgumentException;
use JsonException;

// Ghi một vòng chấm ra thư mục riêng: results.json (máy đọc, để so vòng sau) và report.md
// (người đọc: bảng điểm, chi phí, độ trễ, ca trượt kèm trích đoạn và lý do giám khảo).
final class ReportWriter
{
    public const RESULTS_FILE = 'results.json';

    public const REPORT_FILE = 'report.md';

    private const FORMAT_VERSION = 1;

    // Ca trượt: có tiêu chí riêng không đạt, lỗi bộ chấm, hoặc tiêu chí chung từ mức này trở xuống.
    private const LOW_SCORE = 2;

    private const EXCERPT_LINES = 12;

    private const EXCERPT_CHARACTERS = 400;

    public function __construct(private readonly Filesystem $files) {}

    /**
     * @param  array<string, mixed>  $meta
     * @param  list<ScenarioRun>  $runs
     */
    public function write(string $directory, array $meta, Scorecard $scorecard, array $runs, ?Comparison $comparison): void
    {
        $this->files->ensureDirectoryExists($directory);
        $this->files->put($directory.'/'.self::RESULTS_FILE, json_encode([
            'version' => self::FORMAT_VERSION,
            'meta' => $meta,
            'scorecard' => $scorecard->toArray(),
            'runs' => array_map(fn (ScenarioRun $run) => $run->toArray(), $runs),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $this->files->put($directory.'/'.self::REPORT_FILE, $this->markdown($meta, $scorecard, $runs, $comparison));
    }

    /** @return array<string, mixed> nội dung results.json của một vòng trước (thư mục hoặc chính tệp) */
    public function readResults(string $path): array
    {
        $file = $this->files->isDirectory($path) ? rtrim($path, '/').'/'.self::RESULTS_FILE : $path;

        if (! $this->files->exists($file)) {
            throw new InvalidArgumentException("No eval results at {$file}.");
        }

        try {
            $results = json_decode($this->files->get($file), true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException("{$file}: {$exception->getMessage()}", previous: $exception);
        }

        if (! is_array($results) || ! is_array($results['scorecard'] ?? null)) {
            throw new InvalidArgumentException("{$file} holds no scorecard.");
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  list<ScenarioRun>  $runs
     */
    public function markdown(array $meta, Scorecard $scorecard, array $runs, ?Comparison $comparison): string
    {
        $sections = [
            $this->header($meta, $scorecard),
            $this->dimensionTable($scorecard),
            $this->scenarioTable($runs),
        ];

        if ($comparison !== null) {
            $sections[] = $this->comparisonSection($comparison);
        }

        $sections[] = $this->failures($runs);

        return implode("\n\n", $sections)."\n";
    }

    /** @param array<string, mixed> $meta */
    private function header(array $meta, Scorecard $scorecard): string
    {
        $models = (array) ($meta['models'] ?? []);
        $outcomes = [];

        foreach ($scorecard->outcomes as $outcome => $count) {
            $outcomes[] = (Outcome::tryFrom($outcome)?->label() ?? $outcome).": {$count}";
        }

        return implode("\n", [
            '# Báo cáo chấm hội thoại nhân viên AI',
            '',
            '- Bắt đầu: '.($meta['started_at'] ?? '?').' · Kết thúc: '.($meta['finished_at'] ?? '?'),
            '- Mô hình AI: '.($models['ai'] ?? '?').' · Khách giả: '.($models['customer'] ?? '?').' · Giám khảo: '.($models['judge'] ?? '?'),
            '- Commit: '.($meta['commit'] ?? '?').' · Account shop mẫu: #'.($meta['account_id'] ?? '?'),
            "- Số lần chạy: {$scorecard->runs} (giám khảo chấm được {$scorecard->judgedRuns}) · Lượt AI: {$scorecard->aiTurns}",
            '- Kết thúc: '.($outcomes === [] ? '—' : implode(', ', $outcomes)),
            '- **Điểm trung bình chung: '.self::score($scorecard->overallMean).'/5** · Tiêu chí riêng đạt: '
                ."{$scorecard->criteriaPassed}/{$scorecard->criteriaTotal} (".self::percent($scorecard->criteriaPassRate()).')'
                ." · Kịch bản đạt trọn: {$scorecard->passedRuns}/{$scorecard->runs}",
            '- Chi phí AI: '.self::usd($scorecard->aiCostMicroUsd).' · Chi phí bộ chấm (khách giả + giám khảo): '.self::usd($scorecard->evalCostMicroUsd)
                .' · Độ trễ trung bình mỗi lượt: '.self::seconds($scorecard->averageTurnLatencyMs),
        ]);
    }

    private function dimensionTable(Scorecard $scorecard): string
    {
        $rows = ['## Điểm trung bình từng tiêu chí chung', '', '| Tiêu chí | Điểm (1-5) |', '|---|---|'];

        foreach ($scorecard->dimensionMeans as $dimension => $mean) {
            $rows[] = '| '.Rubric::label($dimension)." (`{$dimension}`) | ".self::score($mean).' |';
        }

        return implode("\n", $rows);
    }

    /** @param list<ScenarioRun> $runs */
    private function scenarioTable(array $runs): string
    {
        $dimensions = Rubric::dimensionIds();
        $rows = [
            '## Bảng điểm từng kịch bản',
            '',
            '| Kịch bản | Lần | Kết thúc | Lượt | '.implode(' | ', $dimensions).' | TB | Tiêu chí riêng | Hội thoại | Độ trễ TB |',
            '|'.str_repeat('---|', count($dimensions) + 8),
        ];

        foreach ($runs as $run) {
            $scores = array_map(fn (string $dimension) => self::score($run->verdict?->scores[$dimension]->score ?? null), $dimensions);
            $criteria = $run->verdict === null ? '—' : count(array_filter($run->verdict->criteria, fn (CriterionResult $criterion) => $criterion->passed)).'/'.count($run->verdict->criteria);

            $rows[] = "| {$run->scenarioId} | {$run->repeat} | {$run->outcome->label()} | ".count($run->turns).' | '.implode(' | ', $scores)
                .' | '.self::score($run->verdict?->averageScore())." | {$criteria} | ".($run->displayId === null ? '—' : "#{$run->displayId}")
                .' | '.self::seconds($run->averageLatencyMs()).' |';
        }

        return implode("\n", $rows);
    }

    private function comparisonSection(Comparison $comparison): string
    {
        $rows = ["## So với vòng trước ({$comparison->previousLabel})", '', '| Chỉ số | Trước | Nay | Chênh |', '|---|---|---|---|'];

        foreach ($comparison->metrics as $metric) {
            $rows[] = "| {$metric['label']} | ".self::number($metric['previous']).' | '.self::number($metric['current']).' | '.self::signed(Comparison::delta($metric['previous'], $metric['current'])).' |';
        }

        $rows = [...$rows, '', '| Kịch bản | TB trước | TB nay | Chênh | Tiêu chí riêng trước (%) | nay (%) |', '|---|---|---|---|---|---|'];

        foreach ($comparison->scenarios as $scenario) {
            $rows[] = "| {$scenario['scenario']} | ".self::number($scenario['previous']).' | '.self::number($scenario['current']).' | '
                .self::signed(Comparison::delta($scenario['previous'], $scenario['current'])).' | '.self::number($scenario['previous_pass']).' | '.self::number($scenario['current_pass']).' |';
        }

        return implode("\n", $rows);
    }

    /** @param list<ScenarioRun> $runs */
    private function failures(array $runs): string
    {
        $blocks = ['## Ca trượt'];

        foreach ($runs as $run) {
            if ($this->isFailure($run)) {
                $blocks[] = $this->failure($run);
            }
        }

        if (count($blocks) === 1) {
            $blocks[] = 'Không có ca trượt.';
        }

        return implode("\n\n", $blocks);
    }

    private function isFailure(ScenarioRun $run): bool
    {
        if ($run->verdict === null || ! $run->verdict->passedAll()) {
            return true;
        }

        foreach ($run->verdict->scores as $score) {
            if ($score->score !== null && $score->score <= self::LOW_SCORE) {
                return true;
            }
        }

        return false;
    }

    private function failure(ScenarioRun $run): string
    {
        $lines = ["### {$run->scenarioId} · lần {$run->repeat} · {$run->outcome->label()}".($run->displayId === null ? '' : " · hội thoại #{$run->displayId}")];

        if ($run->error !== null) {
            $lines[] = "- Lỗi bộ chấm: `{$run->error}`";
        }

        foreach ($run->verdict->criteria ?? [] as $criterion) {
            if (! $criterion->passed) {
                $lines[] = "- Không đạt **{$criterion->id}** ({$criterion->text}): {$criterion->reason}";
            }
        }

        foreach ($run->verdict->scores ?? [] as $score) {
            if ($score->score !== null && $score->score <= self::LOW_SCORE) {
                $lines[] = '- '.Rubric::label($score->dimension)." = {$score->score}: {$score->reason}";
            }
        }

        if ($run->verdict !== null && $run->verdict->summary !== '') {
            $lines[] = "- Nhận xét: {$run->verdict->summary}";
        }

        foreach ($run->verdict->weaknesses ?? [] as $weakness) {
            $lines[] = "- Điểm yếu: {$weakness['issue']}".($weakness['quote'] === '' ? '' : " — «{$weakness['quote']}»");
        }

        return implode("\n", [...$lines, '', 'Trích đoạn:', '', '```text', ...$this->excerpt($run), '```']);
    }

    /** @return list<string> */
    private function excerpt(ScenarioRun $run): array
    {
        $visible = array_values(array_filter($run->transcript, fn (TranscriptLine $line) => $line->speaker !== Speaker::Event));
        $tail = array_slice($visible, -self::EXCERPT_LINES);
        $lines = count($visible) > count($tail) ? ['…'] : [];

        foreach ($tail as $line) {
            $text = preg_replace('/\s+/u', ' ', $line->text) ?? $line->text;
            $lines[] = $line->speaker->judgeLabel().' '.(mb_strlen($text) > self::EXCERPT_CHARACTERS ? mb_substr($text, 0, self::EXCERPT_CHARACTERS).'…' : $text);
        }

        return $lines;
    }

    private static function score(?float $value): string
    {
        return $value === null ? '—' : number_format($value, 2);
    }

    private static function number(?float $value): string
    {
        return $value === null ? '—' : number_format($value, 2);
    }

    private static function signed(?float $value): string
    {
        return $value === null ? '—' : ($value >= 0 ? '+' : '').number_format($value, 2);
    }

    private static function percent(?float $ratio): string
    {
        return $ratio === null ? '—' : number_format($ratio * 100, 1).'%';
    }

    private static function usd(int $microUsd): string
    {
        return '$'.number_format($microUsd / 1_000_000, 4);
    }

    private static function seconds(?float $milliseconds): string
    {
        return $milliseconds === null ? '—' : number_format($milliseconds / 1000, 1).'s';
    }
}
