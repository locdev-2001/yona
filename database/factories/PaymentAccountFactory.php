<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\PaymentAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentAccountFactory extends Factory
{
    protected $model = PaymentAccount::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'bank_bin' => '970436',
            'bank_code' => 'VCB',
            'account_number' => (string) fake()->unique()->numberBetween(1_000_000_000, 9_999_999_999),
            'account_name' => 'HO KINH DOANH GOM MOC',
            'memo_template' => '{ma_hoi_thoai}',
            'is_default' => false,
            'allow_all_agents' => true,
        ];
    }
}
