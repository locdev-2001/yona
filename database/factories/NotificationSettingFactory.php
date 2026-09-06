<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NotificationSetting> */
class NotificationSettingFactory extends Factory
{
    protected $model = NotificationSetting::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'user_id' => User::factory(),
            'email_flags' => 0,
            'push_flags' => 0,
        ];
    }
}
