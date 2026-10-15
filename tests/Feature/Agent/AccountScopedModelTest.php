<?php

use App\Models\Account;
use App\Models\Agent\AccountScopedModel;
use App\Models\Agent\MissingAccountScope;
use App\Models\Label;

// Bảng agent_* chưa có ở pha này: model thử trỏ vào bảng lõi có account_id.
function scopedLabelModel(): AccountScopedModel
{
    return new class extends AccountScopedModel
    {
        protected $table = 'labels';

        protected $guarded = [];
    };
}

it('ném lỗi khi truy vấn đọc không lọc account_id', function () {
    scopedLabelModel()->newQuery()->where('title', 'x')->get();
})->throws(MissingAccountScope::class);

it('chỉ trả dòng của đúng account khi lọc account_id', function (string $column) {
    $mine = Account::factory()->create();
    $other = Account::factory()->create();
    Label::factory()->for($mine)->create(['title' => 'vip']);
    Label::factory()->for($other)->create(['title' => 'vip']);

    $rows = scopedLabelModel()->newQuery()->where($column, $mine->id)->get();

    expect($rows)->toHaveCount(1)
        ->and($rows->first()->account_id)->toBe($mine->id);
})->with(['account_id', 'labels.account_id']);

it('không coi điều kiện khác dấu bằng là lọc theo account', function () {
    scopedLabelModel()->newQuery()->where('account_id', '>', 0)->get();
})->throws(MissingAccountScope::class);

it('ghi, nạp lại và xoá qua model không cần phép kiểm đọc', function () {
    $account = Account::factory()->create();
    $model = scopedLabelModel();
    $model->forceFill(['account_id' => $account->id, 'title' => 'moi', 'color' => '#000000'])->save();

    $model->refresh();
    $model->delete();

    expect(Label::query()->where('account_id', $account->id)->exists())->toBeFalse();
});
