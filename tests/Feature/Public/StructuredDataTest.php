<?php

function luocDoCua(string $duong): array
{
    preg_match_all(
        '#<script type="application/ld\+json">(.*?)</script>#s',
        test()->get($duong)->getContent(),
        $khop
    );

    return array_map(fn (string $json) => json_decode($json, true, flags: JSON_THROW_ON_ERROR), $khop[1]);
}

it('emits valid json-ld on every public page', function (string $duong) {
    $luocDo = luocDoCua($duong);

    expect($luocDo)->not->toBeEmpty();

    foreach ($luocDo as $mot) {
        expect($mot)->toHaveKeys(['@context', '@type'])
            ->and($mot['@context'])->toBe('https://schema.org');
    }
})->with(['/', '/zalo-ca-nhan', '/dat-lich-demo']);

it('declares the organization with a logo file that exists', function () {
    $toChuc = collect(luocDoCua('/'))->firstWhere('@type', 'Organization');

    expect($toChuc)->not->toBeNull()
        ->and($toChuc['name'])->toBe(config('yona.branding.brand_name'));

    $duongDan = parse_url($toChuc['logo'], PHP_URL_PATH);

    expect(public_path(ltrim($duongDan, '/')))->toBeFile();
});

it('gives each page the type that matches what it is', function () {
    expect(collect(luocDoCua('/'))->pluck('@type'))->toContain('WebSite')
        ->and(collect(luocDoCua('/zalo-ca-nhan'))->pluck('@type'))->toContain('Service')
        ->and(collect(luocDoCua('/dat-lich-demo'))->pluck('@type'))->toContain('ContactPage');
});

// Google phạt nặng nhất nhóm này khi đánh giá/giá là bịa. Yona chưa có gói cước
// nào và chưa thu đánh giá nào, nên không lược đồ nào được khai chúng.
it('never claims ratings, reviews or prices it does not have', function (string $duong) {
    $tho = json_encode(luocDoCua($duong));

    foreach (['aggregateRating', 'review', 'ratingValue', 'offers', 'price'] as $khoaCam) {
        expect($tho)->not->toContain($khoaCam);
    }
})->with(['/', '/zalo-ca-nhan', '/dat-lich-demo']);

// Trang cảm ơn noindex: chỉ cần danh tính tổ chức, không cần lược đồ trang.
it('keeps the thank-you page down to the organization', function () {
    expect(collect(luocDoCua('/dat-lich-demo/cam-on'))->pluck('@type')->all())
        ->toBe(['Organization']);
});
