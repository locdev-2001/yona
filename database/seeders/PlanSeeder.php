<?php

namespace Database\Seeders;

use App\Models\MarketplaceItem;
use Illuminate\Database\Seeder;

/**
 * Seed 3 gói cước GĐ1: plan.free / plan.team / plan.business.
 *
 * PLACEHOLDER quota — founder chốt SỐ + GIÁ trước launch (Free/Team/Business).
 * KHÔNG để số placeholder lọt production: quota thật quyết theo unit-economics
 * (CAC/LTV → margin → break-even). Tìm kiếm "PLACEHOLDER" để cập nhật trước launch.
 *
 * price_cents = 0 vì GĐ1 dùng admin cấp tay (payment-manual), chưa có checkout.
 * Cập nhật price_cents khi tích hợp VNPay/MoMo (GĐ2+).
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'code' => 'plan.free',
                'name' => 'Free',
                'type' => 'plan',
                'billing_type' => 'one_off',
                'price_cents' => 0, // PLACEHOLDER — founder chốt giá trước launch
                'currency' => 'VND',
                'is_active' => true,
                'entitlements' => [
                    'flags' => [
                        'module.inbox',
                    ],
                    'quotas' => [
                        // PLACEHOLDER — founder chốt số trước launch
                        'quota.conversations.zalo_personal' => 50,
                        'quota.seats' => 3,
                    ],
                ],
            ],
            [
                'code' => 'plan.team',
                'name' => 'Team',
                'type' => 'plan',
                'billing_type' => 'one_off',
                'price_cents' => 0, // PLACEHOLDER — founder chốt giá trước launch
                'currency' => 'VND',
                'is_active' => true,
                'entitlements' => [
                    'flags' => [
                        'module.inbox',
                        'integration.zalo_personal',
                    ],
                    'quotas' => [
                        // PLACEHOLDER — founder chốt số trước launch
                        'quota.conversations.zalo_personal' => 1000,
                        'quota.seats' => 10,
                    ],
                ],
            ],
            [
                'code' => 'plan.business',
                'name' => 'Business',
                'type' => 'plan',
                'billing_type' => 'one_off',
                'price_cents' => 0, // PLACEHOLDER — founder chốt giá trước launch
                'currency' => 'VND',
                'is_active' => true,
                'entitlements' => [
                    'flags' => [
                        'module.inbox',
                        'integration.zalo_personal',
                        'module.projects',
                    ],
                    'quotas' => [
                        // PLACEHOLDER — founder chốt số trước launch
                        'quota.conversations.zalo_personal' => 5000,
                        'quota.seats' => 50,
                    ],
                ],
            ],
        ];

        foreach ($plans as $plan) {
            MarketplaceItem::updateOrCreate(
                ['code' => $plan['code']],
                $plan
            );
        }
    }
}
