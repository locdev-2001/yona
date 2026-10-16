<?php

use App\Agent\Evals\Comparison;
use App\Agent\Evals\CustomerIntent;
use App\Agent\Evals\CustomerMove;
use App\Agent\Evals\EvalModel;
use App\Agent\Evals\Outcome;
use App\Agent\Evals\Scorecard;
use App\Agent\Evals\Verdict;
use Tests\Feature\Agent\Evals\EvalFixtures;

test('phán quyết đọc đủ tiêu chí chung, tiêu chí riêng theo thứ tự kịch bản và điểm yếu', function () {
    $verdict = EvalFixtures::verdict(['tone' => 2, 'handoff' => null], ['no-fake-stock' => false]);

    expect($verdict->scores['tone']->score)->toBe(2)
        ->and($verdict->scores['handoff']->score)->toBeNull()
        ->and(array_map(fn ($criterion) => $criterion->id, $verdict->criteria))->toBe(['states-price', 'no-fake-stock'])
        ->and($verdict->passedAll())->toBeFalse()
        ->and($verdict->averageScore())->toBe((4 + 2 + 4 + 4 + 4) / 5)
        ->and($verdict->weaknesses[0]['quote'])->toBe('Dạ váy giá 189.000đ ạ.');
});

test('phán quyết thiếu tiêu chí hoặc điểm ngoài thang bị từ chối để giám khảo chấm lại', function (array $json) {
    Verdict::fromJudgeJson($json, EvalFixtures::scenario());
})->throws(InvalidArgumentException::class)->with([
    'thiếu tiêu chí riêng' => [array_replace(EvalFixtures::judgeJson(), ['criteria' => [['id' => 'states-price', 'passed' => true]]])],
    'điểm 7' => [EvalFixtures::judgeJson(['safety' => 7])],
    'thiếu tiêu chí chung' => [(function () {
        $json = EvalFixtures::judgeJson();
        unset($json['scores']['tone']);

        return $json;
    })()],
    'passed không phải bool' => [array_replace(EvalFixtures::judgeJson(), ['criteria' => [['id' => 'states-price', 'passed' => 'yes'], ['id' => 'no-fake-stock', 'passed' => true]]])],
]);

test('phán quyết ghi ra rồi đọc lại giữ nguyên', function () {
    $verdict = EvalFixtures::verdict(['closing' => 3], ['states-price' => false]);

    expect(Verdict::fromArray(json_decode(json_encode($verdict->toArray()), true)))->toEqual($verdict);
});

test('đọc JSON của mô hình kể cả khi bị bọc chữ, từ chối khi không có đối tượng', function () {
    expect(EvalModel::decode("Đây:\n```json\n{\"end\": \"continue\", \"message\": \"ok\"}\n```"))->toBe(['end' => 'continue', 'message' => 'ok']);

    EvalModel::decode('không có json');
})->throws(InvalidArgumentException::class);

test('bước của khách giả: tiếp tục phải có tin nhắn, kết thúc thì không bắt buộc', function () {
    expect(CustomerMove::fromJson(['end' => 'goal_met', 'message' => ''])->intent)->toBe(CustomerIntent::GoalMet)
        ->and(CustomerMove::fromJson(['end' => 'continue', 'message' => 'còn size M không'])->message)->toBe('còn size M không');

    CustomerMove::fromJson(['end' => 'continue', 'message' => ' ']);
})->throws(InvalidArgumentException::class);

test('bảng điểm tính trung bình từng tiêu chí, tỉ lệ đạt, chi phí và độ trễ; lần chạy hỏng không kéo điểm', function () {
    $scorecard = Scorecard::of([
        EvalFixtures::run('a', EvalFixtures::verdict(['tone' => 2, 'handoff' => null]), [1000, 3000], aiCost: 1_000, evalCost: 10_000),
        EvalFixtures::run('b', EvalFixtures::verdict(['tone' => 4, 'handoff' => 5], ['no-fake-stock' => false]), [2000], aiCost: 3_000, evalCost: 20_000),
        EvalFixtures::run('c', null, [4000], Outcome::EvalError, aiCost: 500, evalCost: 5_000),
    ]);

    expect($scorecard->runs)->toBe(3)
        ->and($scorecard->judgedRuns)->toBe(2)
        ->and($scorecard->dimensionMeans['tone'])->toBe(3.0)
        ->and($scorecard->dimensionMeans['handoff'])->toBe(5.0)
        ->and($scorecard->criteriaPassed)->toBe(3)
        ->and($scorecard->criteriaTotal)->toBe(4)
        ->and($scorecard->criteriaPassRate())->toBe(0.75)
        ->and($scorecard->passedRuns)->toBe(1)
        ->and($scorecard->outcomes)->toBe(['goal_met' => 2, 'eval_error' => 1])
        ->and($scorecard->aiCostMicroUsd)->toBe(4_500)
        ->and($scorecard->evalCostMicroUsd)->toBe(35_000)
        ->and($scorecard->aiTurns)->toBe(4)
        ->and($scorecard->averageTurnLatencyMs)->toBe(2500.0)
        ->and($scorecard->scenarios['b']['criteria_passed'])->toBe(1)
        ->and($scorecard->scenarios['c']['mean'])->toBeNull();
});

test('so sánh hai vòng cho chênh lệch từng chỉ số và từng kịch bản', function () {
    $previous = Scorecard::of([EvalFixtures::run('a', EvalFixtures::verdict(['tone' => 2]))])->toArray();
    $current = Scorecard::of([EvalFixtures::run('a', EvalFixtures::verdict(['tone' => 4]))])->toArray();

    $comparison = Comparison::between($current, $previous, 'vòng 1');
    $tone = array_values(array_filter($comparison->metrics, fn ($metric) => str_contains($metric['label'], 'Giọng')))[0];

    expect(Comparison::delta($tone['previous'], $tone['current']))->toBe(2.0)
        ->and($comparison->scenarios[0]['scenario'])->toBe('a')
        ->and(Comparison::delta($comparison->scenarios[0]['previous'], $comparison->scenarios[0]['current']))->toBeGreaterThan(0.0);
});
