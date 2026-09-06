<?php

namespace Database\Factories\Integrations;

use App\Models\Account;
use App\Models\Integrations\Hook;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Hook> */
class HookFactory extends Factory
{
    protected $model = Hook::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'app_id' => 'slack',
            'hook_type' => Hook::TYPE_ACCOUNT,
            'status' => Hook::STATUS_ENABLED,
            'settings' => [],
        ];
    }
}
