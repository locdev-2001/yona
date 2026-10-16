<?php

use App\Agent\Evals\Comparison;
use App\Agent\Evals\Outcome;
use App\Agent\Evals\ReportWriter;
use App\Agent\Evals\ScenarioRun;
use App\Agent\Evals\Scorecard;
use Illuminate\Filesystem\Filesystem;
use Tests\Feature\Agent\Evals\EvalFixtures;

beforeEach(function () {
    $this->directory = sys_get_temp_dir().'/agent-eval-report-'.uniqid();
    $this->writer = new ReportWriter(new Filesystem);
});

afterEach(function () {
    (new Filesystem)->deleteDirectory($this->directory);
});

test('ghi results.json đọc lại được từng lần chạy và report.md có bảng điểm, chi phí, ca trượt kèm trích đoạn', function () {
    $runs = [
        EvalFixtures::run('ask-price', EvalFixtures::verdict()),
        EvalFixtures::run('complaint', EvalFixtures::verdict(['handoff' => 1], ['states-price' => false]), [8000], Outcome::HandedOff),
        EvalFixtures::run('broken', null, [], Outcome::EvalError),
    ];

    $this->writer->write($this->directory, ['started_at' => '2026-10-16T09:00:00+07:00', 'models' => ['ai' => 'main → openai/gpt-6-luna']], Scorecard::of($runs), $runs, null);

    $results = $this->writer->readResults($this->directory);
    $report = file_get_contents($this->directory.'/'.ReportWriter::REPORT_FILE);

    expect(array_map(fn (array $run) => ScenarioRun::fromArray($run), $results['runs']))->toEqual($runs)
        ->and($results['scorecard']['criteria_total'])->toBe(4)
        ->and($report)->toContain('| ask-price | 1 | khách đạt mục tiêu |')
        ->and($report)->toContain('Chi phí AI: $0.0030')
        ->and($report)->toContain('### complaint · lần 1 · AI chuyển người · hội thoại #3')
        ->and($report)->toContain('Không đạt **states-price**')
        ->and($report)->toContain('Chuyển người đúng lúc = 1')
        ->and($report)->toContain('[AI trả lời khách] Dạ váy giá 189.000đ ạ.')
        ->and($report)->toContain('Lỗi bộ chấm: `RuntimeException: judge down`')
        ->and($report)->not->toContain('### ask-price');
});

test('report có phần so với vòng trước khi truyền so sánh', function () {
    $runs = [EvalFixtures::run('ask-price', EvalFixtures::verdict(['tone' => 5]))];
    $previous = Scorecard::of([EvalFixtures::run('ask-price', EvalFixtures::verdict(['tone' => 3]))])->toArray();
    $scorecard = Scorecard::of($runs);

    $this->writer->write($this->directory, [], $scorecard, $runs, Comparison::between($scorecard->toArray(), $previous, '20261015-0900'));

    expect(file_get_contents($this->directory.'/'.ReportWriter::REPORT_FILE))
        ->toContain('## So với vòng trước (20261015-0900)')
        ->toContain('| Giọng tự nhiên như người bán hàng Việt | 3.00 | 5.00 | +2.00 |');
});

test('đọc kết quả vòng trước không có thì báo lỗi rõ', function () {
    $this->writer->readResults($this->directory.'/khong-co');
})->throws(InvalidArgumentException::class, 'No eval results');
