<?php

use App\Models\Account;
use App\Models\DataImport;

it('names the import after its data type when no name is given', function () {
    $dataImport = DataImport::factory()->create(['account_id' => Account::factory()]);

    expect($dataImport->name)->toBe('Contacts - '.now()->toDateString());
});

it('keeps a name that was given', function () {
    $dataImport = DataImport::factory()->create(['account_id' => Account::factory(), 'name' => 'Danh sách khách hàng']);

    expect($dataImport->name)->toBe('Danh sách khách hàng');
});

it('exposes the status by name', function () {
    $dataImport = DataImport::factory()->create(['account_id' => Account::factory()]);

    expect($dataImport->statusName())->toBe('pending');

    $dataImport->markStatus('completed_with_errors');

    expect($dataImport->refresh()->statusName())->toBe('completed_with_errors')
        ->and($dataImport->status)->toBe(6);
});

it('recognises the legacy contacts csv import', function () {
    $csvImport = DataImport::factory()->create(['account_id' => Account::factory()]);
    $integrationImport = DataImport::factory()->create([
        'account_id' => Account::factory(),
        'data_type' => 'intercom',
        'source_provider' => 'intercom',
    ]);

    expect($csvImport->isLegacyContactsCsvImport())->toBeTrue()
        ->and($integrationImport->isLegacyContactsCsvImport())->toBeFalse();
});
