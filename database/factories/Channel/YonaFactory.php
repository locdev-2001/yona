<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Yona;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Yona>
 */
class YonaFactory extends Factory
{
    protected $model = Yona::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
        ];
    }
}
