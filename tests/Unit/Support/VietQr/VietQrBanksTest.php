<?php

const VIETQR_REPO_ROOT = __DIR__.'/../../../..';

$banks = require VIETQR_REPO_ROOT.'/config/vietqr_banks.php';

it('mỗi ngân hàng chọn được đều có logo tự host theo BIN', function (string $bin) {
    expect(VIETQR_REPO_ROOT."/public/bank-logos/{$bin}.png")->toBeFile();
})->with(array_column($banks, 'bin'));

it('BIN không trùng và đều là BIN NAPAS 970xxx', function () use ($banks) {
    $bins = array_column($banks, 'bin');

    expect($bins)->toHaveCount(count(array_unique($bins)))
        ->and($bins)->each->toMatch('/^970\d{3}$/');
});
