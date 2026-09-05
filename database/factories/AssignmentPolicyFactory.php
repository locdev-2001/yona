<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\AssignmentPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssignmentPolicy>
 */
class AssignmentPolicyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => 'Assignment Policy '.fake()->unique()->numberBetween(1, 100000),
            'description' => 'Test assignment policy description',
            'assignment_order' => AssignmentPolicy::ORDER_ROUND_ROBIN,
            'conversation_priority' => AssignmentPolicy::PRIORITY_EARLIEST_CREATED,
            'fair_distribution_limit' => 10,
            'fair_distribution_window' => 3600,
            'enabled' => true,
        ];
    }
}
