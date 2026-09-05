<?php

namespace Database\Factories;

use App\Models\AssignmentPolicy;
use App\Models\Inbox;
use App\Models\InboxAssignmentPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InboxAssignmentPolicy>
 */
class InboxAssignmentPolicyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'inbox_id' => Inbox::factory(),
            'assignment_policy_id' => AssignmentPolicy::factory(),
        ];
    }
}
