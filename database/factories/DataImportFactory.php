<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\DataImport;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DataImport> */
class DataImportFactory extends Factory
{
    protected $model = DataImport::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'data_type' => DataImport::DATA_TYPE_CONTACTS,
            'source_type' => 'file',
            'status' => DataImport::STATUSES['pending'],
        ];
    }
}
