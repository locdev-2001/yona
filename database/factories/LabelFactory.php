<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Label;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Label> */
class LabelFactory extends Factory
{
    protected $model = Label::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'title' => 'label-'.fake()->unique()->numberBetween(1, 999999),
            'description' => fake()->sentence(),
            'color' => Label::DEFAULT_COLOR,
            'show_on_sidebar' => true,
        ];
    }
}
