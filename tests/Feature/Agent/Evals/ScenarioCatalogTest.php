<?php

use App\Agent\Evals\Scenario;
use App\Agent\Evals\ScenarioCatalog;
use App\Agent\Evals\ShopFixture;
use Tests\Feature\Agent\Evals\EvalFixtures;

test('mọi kịch bản kèm theo đọc được, đủ số lượng và có tiêu chí riêng', function () {
    $scenarios = (new ScenarioCatalog)->all();

    expect(count($scenarios))->toBeGreaterThanOrEqual(15);

    foreach ($scenarios as $scenario) {
        expect($scenario->criteria)->not->toBeEmpty()
            ->and($scenario->opening)->not->toBe('');
    }

    $returning = array_values(array_filter($scenarios, fn (Scenario $scenario) => $scenario->id === 'returning-customer'))[0];
    expect($returning->history)->not->toBeEmpty()
        ->and($returning->history[0]->daysAgo)->toBeGreaterThan(0);
});

test('chọn kịch bản theo id và báo id lạ', function () {
    $catalog = new ScenarioCatalog;

    expect(array_map(fn (Scenario $scenario) => $scenario->id, $catalog->select(['prompt-injection', 'bank-transfer'])))
        ->toBe(['bank-transfer', 'prompt-injection']);

    $catalog->select(['khong-co']);
})->throws(InvalidArgumentException::class, 'Unknown scenario: khong-co.');

test('kịch bản sai hình dạng bị từ chối', function (array $overrides) {
    EvalFixtures::scenario($overrides);
})->throws(InvalidArgumentException::class)->with([
    'thiếu tiêu chí' => [['criteria' => []]],
    'id sai' => [['id' => 'Có Dấu']],
    'quá nhiều lượt' => [['max_turns' => 99]],
    'tiêu chí trùng' => [['criteria' => [['id' => 'a-b', 'text' => 'x'], ['id' => 'a-b', 'text' => 'y']]]],
    'lịch sử sai người nói' => [['history' => [['speaker' => 'bot', 'text' => 'x', 'days_ago' => 1]]]],
]);

test('tên tệp kịch bản phải trùng id', function () {
    $directory = sys_get_temp_dir().'/agent-eval-catalog-'.uniqid();
    mkdir($directory);
    file_put_contents("{$directory}/khac-ten.json", json_encode(EvalFixtures::scenarioArray()));

    try {
        (new ScenarioCatalog($directory))->all();
    } finally {
        unlink("{$directory}/khac-ten.json");
        rmdir($directory);
    }
})->throws(InvalidArgumentException::class, 'file name must match the id');

test('shop mẫu đọc được và sự thật cho giám khảo chứa giá, chính sách, tài khoản', function () {
    $fixture = ShopFixture::fromFile();
    $truth = $fixture->groundTruth();

    expect(count($fixture->products))->toBeGreaterThanOrEqual(6)
        ->and($truth)->toContain('189.000đ')
        ->and($truth)->toContain('đổi size')
        ->and($truth)->toContain($fixture->paymentAccount['account_number']);
});
