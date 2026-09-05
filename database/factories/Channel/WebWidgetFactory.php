<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\WebWidget;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebWidget>
 */
class WebWidgetFactory extends Factory
{
    protected $model = WebWidget::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'website_url' => 'https://'.fake()->unique()->domainName(),
        ];
    }
}
