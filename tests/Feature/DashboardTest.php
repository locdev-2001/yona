<?php

namespace Tests\Feature;

use Modules\Identity\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use DatabaseTransactions;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_members_can_visit_the_dashboard()
    {
        $this->actingAs($this->createWorkspaceUser());

        $this->get('/dashboard')->assertOk();
    }

    public function test_users_without_an_active_workspace_membership_are_forbidden()
    {
        $this->actingAs(User::factory()->create());

        $this->get('/dashboard')->assertForbidden();
    }
}
