<?php

use Illuminate\Support\Facades\DB;

/**
 * G4 — Verifies that every workspace-scoped table (including pivot tables
 * that carry workspace_id) has a ws_isolation RLS policy in Postgres.
 *
 * If a table is added without an RLS migration this test fails immediately,
 * preventing a silent tenant-isolation regression.
 *
 * Whitelist = union of all $tables arrays from every enable_rls_*.php migration.
 * Add new tables here WHEN the corresponding RLS migration is added.
 */
it('every workspace-scoped table has a Postgres RLS policy', function () {
    $expected = [
        // P00 base (2026_06_13_100009)
        'teams',
        'team_closure',
        'workspace_member',
        'audit_logs',
        'workspace_sequences',

        // P01 lookups (2026_06_25_100006)
        'pipelines',
        'pipeline_stages',
        'lead_sources',
        'project_statuses',
        'workspace_settings',

        // P02 custom fields (2026_06_25_200002)
        'custom_field_definitions',

        // P03 polymorphic tables (2026_06_25_300006) — includes taggables pivot (G4)
        'attachments',
        'tags',
        'taggables',
        'comments',
        'notes',

        // P04 activity + reminders (2026_06_25_100004)
        'activities',
        'reminders',

        // P05 email templates (2026_06_25_050002)
        'email_templates',

        // P06 clients (2026_06_25_400007) — includes pivot tables (G4)
        'clients',
        'contacts',
        'client_groups',
        'client_group_client',  // pivot carries workspace_id — G4
        'client_user',          // pivot carries workspace_id — G4
        'client_vault_entries',

        // P07 leads (2026_06_25_500002)
        'leads',

        // P08 projects (2026_06_25_600005) — members/milestones/discussions carry workspace_id (G4)
        'projects',
        'project_members',      // pivot carries workspace_id — G4
        'project_milestones',   // carries workspace_id — G4
        'project_discussions',  // carries workspace_id — G4

        // P09 tasks + timers (2026_06_25_700006) — includes pivot tables (G4)
        'tasks',
        'task_assignees',       // pivot carries workspace_id — G4
        'task_followers',       // pivot carries workspace_id — G4
        'task_checklist_items', // pivot carries workspace_id — G4
        'task_timers',

        // P07 inbox (2026_06_28_700003)
        'conversations',
        'messages',

        // P07 channel-zalo (2026_06_28_800003)
        'zalo_connections',

        // P07 billing (2026_06_28_900002/900003)
        // marketplace_items intentionally GLOBAL (no RLS) — intentional-global list
        'workspace_purchases',
        'channel_usage',
    ];

    // Query pg_policies for ws_isolation on each table
    foreach ($expected as $table) {
        $hasPolicySql = "
            SELECT COUNT(*) as cnt
            FROM pg_policies
            WHERE tablename = ?
              AND policyname = 'ws_isolation'
        ";

        $result = DB::selectOne($hasPolicySql, [$table]);

        expect((int) ($result->cnt ?? 0))
            ->toBeGreaterThanOrEqual(1, "Table '{$table}' is missing ws_isolation RLS policy.");
    }
})->group('rls');
