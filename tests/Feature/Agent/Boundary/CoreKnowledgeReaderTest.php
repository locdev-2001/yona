<?php

use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\ValueObjects\KnowledgeHit;
use App\Models\Account;
use App\Models\Article;
use App\Models\CannedResponse;
use App\Models\Portal;
use Tests\Feature\Agent\Runtime\TurnKit;

/** @param  array<string, mixed>  $attributes */
function helpArticle(Account $account, array $attributes): Article
{
    return Article::factory()->create([
        'portal_id' => Portal::factory()->create(['account_id' => $account->id])->id,
        'account_id' => $account->id,
        ...$attributes,
    ]);
}

// Bài dài: phần đệm đủ để giá ở cuối bài nằm ngoài mọi trích đoạn chỉ lấy phần đầu.
function longArticle(Account $account, string $title, string $ending): Article
{
    return helpArticle($account, [
        'title' => $title,
        'description' => 'Áo thun cotton cho mùa hè.',
        'content' => str_repeat('<p>Chất liệu cotton thoáng mát, giặt máy được, không phai màu sau nhiều lần giặt. </p>', 40)."<p>{$ending}</p>",
    ]);
}

it('quotes the part of a long article that matches the query, so a price at the end is kept', function () {
    $account = Account::factory()->create();
    longArticle($account, 'Áo thun trắng', 'Giá áo thun trắng: 450.000đ. Đổi trả trong 7 ngày.');

    $hits = app(KnowledgeReader::class)->search($account->id, 'giá áo thun', 5);

    expect($hits)->toHaveCount(1)
        ->and($hits[0]->excerpt)->toContain('450.000đ')
        ->and($hits[0]->excerpt)->toStartWith('Áo thun cotton cho mùa hè.')
        ->and(mb_strlen($hits[0]->excerpt))->toBeLessThanOrEqual(1_200);
});

it('keeps a short article whole', function () {
    $account = Account::factory()->create();
    helpArticle($account, ['title' => 'Phí ship', 'description' => null, 'content' => '<p>Phí ship nội thành 30.000đ.</p>']);

    $hits = app(KnowledgeReader::class)->search($account->id, 'phí ship', 5);

    expect($hits[0]->excerpt)->toBe('Phí ship nội thành 30.000đ.');
});

it('keeps all results of one search within a fixed character budget', function () {
    $account = Account::factory()->create();

    foreach (range(1, 10) as $index) {
        longArticle($account, "Áo thun mẫu {$index}", "Giá áo thun mẫu {$index}: {$index}50.000đ.");
        CannedResponse::query()->create(['account_id' => $account->id, 'short_code' => "ao-thun-{$index}", 'content' => str_repeat('Áo thun đẹp. ', 200)]);
    }

    $hits = app(KnowledgeReader::class)->search($account->id, 'giá áo thun', 10);
    $total = array_sum(array_map(fn (KnowledgeHit $hit) => mb_strlen($hit->excerpt), $hits));

    expect($hits)->toHaveCount(10)
        ->and($total)->toBeLessThanOrEqual(6_000);
});

it('gives a saved product card its price, sizes and product id instead of an empty text', function () {
    $account = Account::factory()->create();
    $cards = TurnKit::productCards($account->id, 'ao-polo', [[
        'id' => 'polo',
        'title' => 'Áo polo nam',
        'price' => ['amount' => 250000],
        'variants' => [['name' => 'Màu', 'options' => [['value' => 'Xanh'], ['value' => 'Đỏ', 'disabled' => true]]]],
        'actions' => [['kind' => 'order', 'label' => 'Đặt mua']],
    ]]);

    $hits = app(KnowledgeReader::class)->search($account->id, 'polo', 5);

    expect($hits)->toHaveCount(1)
        ->and($hits[0]->ref)->toBe("canned_response:{$cards->id}")
        ->and($hits[0]->excerpt)->toBe("Áo polo nam · 250.000đ · Màu: Xanh, Đỏ (out of stock: Đỏ) · product id {$cards->id}:polo");
});

it('ranks the saved reply that answers the question first, whatever order the replies were created in', function () {
    $account = Account::factory()->create();
    helpArticle($account, ['title' => 'Hướng dẫn chọn size quần áo', 'description' => 'Bảng size áo và váy', 'content' => 'Shop có bảng size cho áo, váy, đầm.']);

    foreach (['gio-mo-cua' => 'Shop mở cửa 9h-21h, có bán online.', 'giao-hang' => 'Shop giao hàng toàn quốc, có ship COD.', 'doi-tra' => 'Shop có đổi size trong 7 ngày.'] as $code => $content) {
        CannedResponse::query()->create(['account_id' => $account->id, 'short_code' => $code, 'content' => $content]);
    }

    $answer = CannedResponse::query()->create(['account_id' => $account->id, 'short_code' => 'san-pham-shop-ban', 'content' => 'Shop chỉ bán quần áo nữ, không bán đồ nam, giày dép.']);

    $hits = app(KnowledgeReader::class)->search($account->id, 'shop co ban ao so mi nam voi giay khong', 2);

    expect($hits[0]->ref)->toBe("canned_response:{$answer->id}");
});

it('does not match a product card by the keys of its stored data', function () {
    $account = Account::factory()->create();
    TurnKit::productCards($account->id, 'ao-polo', [['id' => 'polo', 'title' => 'Áo polo nam', 'price' => ['amount' => 250000]]]);

    expect(app(KnowledgeReader::class)->search($account->id, 'currency amount items', 5))->toBe([]);
});
