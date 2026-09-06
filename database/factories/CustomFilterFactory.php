<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\CustomFilter;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CustomFilter> */
class CustomFilterFactory extends Factory
{
    protected $model = CustomFilter::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'user_id' => User::factory(),
            'name' => 'Custom Filter '.$this->faker->unique()->numberBetween(1, 999999),
            'filter_type' => CustomFilter::TYPE_CONVERSATION,
            'query' => ['labels' => ['customer-support'], 'status' => 'open'],
        ];
    }
}
