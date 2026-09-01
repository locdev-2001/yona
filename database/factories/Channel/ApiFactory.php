<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Api;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Api>
 */
class ApiFactory extends Factory
{
    protected $model = Api::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
        ];
    }
}
