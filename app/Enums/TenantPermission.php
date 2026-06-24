<?php

namespace App\Enums;

/**
 * Tenant-plane (web guard) permission catalog — source of truth in code.
 * Seeded into spatie's permissions table under guard `web`; assignments are
 * scoped per workspace. Symmetric with PlatformPermission (admin plane).
 *
 * Naming convention: tenant.<entity>.<action> (entity singular, action in
 * {view,view_own,create,update,delete}). G2 override — NEVER use domain.* style.
 */
enum TenantPermission: string
{
    // --- Platform / workspace management ---
    case WorkspaceUpdate = 'tenant.workspace.update';
    case TeamManage = 'tenant.team.manage';
    case MemberManage = 'tenant.member.manage';
    case AuditView = 'tenant.audit.view';

    // --- Client (G2) ---
    case ClientView = 'tenant.client.view';
    case ClientViewOwn = 'tenant.client.view_own';
    case ClientCreate = 'tenant.client.create';
    case ClientUpdate = 'tenant.client.update';
    case ClientDelete = 'tenant.client.delete';

    // --- Contact (G2) ---
    case ContactView = 'tenant.contact.view';
    case ContactViewOwn = 'tenant.contact.view_own';
    case ContactCreate = 'tenant.contact.create';
    case ContactUpdate = 'tenant.contact.update';
    case ContactDelete = 'tenant.contact.delete';

    // --- Lead (G2) ---
    case LeadView = 'tenant.lead.view';
    case LeadViewOwn = 'tenant.lead.view_own';
    case LeadCreate = 'tenant.lead.create';
    case LeadUpdate = 'tenant.lead.update';
    case LeadDelete = 'tenant.lead.delete';

    // --- Project (G2) ---
    case ProjectView = 'tenant.project.view';
    case ProjectViewOwn = 'tenant.project.view_own';
    case ProjectCreate = 'tenant.project.create';
    case ProjectUpdate = 'tenant.project.update';
    case ProjectDelete = 'tenant.project.delete';

    // --- Task (G2) ---
    case TaskView = 'tenant.task.view';
    case TaskViewOwn = 'tenant.task.view_own';
    case TaskCreate = 'tenant.task.create';
    case TaskUpdate = 'tenant.task.update';
    case TaskDelete = 'tenant.task.delete';
    // Timesheet-specific permissions (P09 — split from task.update for billing integrity)
    case TaskTimesheetUpdate = 'tenant.task.timesheet.update';
    case TaskTimesheetDelete = 'tenant.task.timesheet.delete';

    // --- Email templates (P05) ---
    case EmailTemplateView = 'tenant.email_template.view';
    case EmailTemplateManage = 'tenant.email_template.manage';

    // --- Custom fields (P02) ---
    case CustomFieldsView = 'custom_fields.view';
    case CustomFieldsManage = 'custom_fields.manage';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
