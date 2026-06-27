<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Relations\Relation;
use Modules\Email\Models\EmailTemplate;
use Illuminate\Support\ServiceProvider;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Models\AnnouncementRead;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\ClientGroup;
use Modules\CrmSales\Models\ClientVaultEntry;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\LeadSource;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\Identity\Models\Admin;
use Modules\Identity\Models\AuditLog;
use Modules\Identity\Models\Team;
use Modules\Identity\Models\TeamClosure;
use Modules\Identity\Models\User;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\ProjectDiscussion;
use Modules\Projects\Models\ProjectMilestone;
use Modules\Projects\Models\ProjectStatus;
use Modules\Projects\Models\Task;
use Modules\Projects\Models\TaskChecklistItem;
use Modules\Projects\Models\TaskTimer;
use Modules\Shared\Models\Activity;
use Modules\Shared\Models\Attachment;
use Modules\Shared\Models\Comment;
use Modules\Shared\Models\CustomFieldDefinition;
use Modules\Shared\Models\Note;
use Modules\Shared\Models\Reminder;
use Modules\Shared\Models\Tag;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Modules\Tenancy\Models\WorkspaceSequence;
use Modules\Tenancy\Models\WorkspaceSetting;

/**
 * G3 - Registers the canonical morph alias map for all polymorphic relations.
 * Enforced (not loose) so storing an FQCN that bypasses the map throws immediately.
 *
 * Every model that can appear in a *_type morph column (audit_logs.entity_type,
 * attachable_type, commentable_type, noteable_type, taggable_type, etc.) MUST
 * have an alias entry here. enforceMorphMap() throws ClassMorphViolationException
 * if getMorphClass() is called on an unregistered model.
 *
 * Aliases MUST match the entity_type values in CustomFieldDefinition::ENTITY_TYPES
 * (P02) - single source of truth per G3.
 */
class MorphMapServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /** @var array<string, class-string> $map */
        $map = [
            // P03 canonical entity aliases (G3 - single source shared with custom_field entity_type).
            'client' => Client::class,
            'contact' => Contact::class,
            'client_group' => ClientGroup::class,
            'client_vault_entry' => ClientVaultEntry::class,
            'lead' => 'Modules\\CrmSales\\Models\\Lead',

            // Phase 05 — projects module (G3: alias string unchanged, FQCN updated).
            'project' => Project::class,
            'project_milestone' => ProjectMilestone::class,
            'project_discussion' => ProjectDiscussion::class,
            'project_status' => ProjectStatus::class,
            'task' => Task::class,
            'task_checklist_item' => TaskChecklistItem::class,
            'task_timer' => TaskTimer::class,

            // P04 models that can appear as subjects (activity/reminder)
            'activity' => Activity::class,
            'reminder' => Reminder::class,

            // Existing platform models that appear in audit_logs.entity_type or
            // any other morph column - all must be registered now that enforce is on.
            'admin' => Admin::class,
            'announcement' => Announcement::class,
            'announcement_read' => AnnouncementRead::class,
            'attachment' => Attachment::class,
            'audit_log' => AuditLog::class,
            'comment' => Comment::class,
            'custom_field_definition' => CustomFieldDefinition::class,
            'email_template' => EmailTemplate::class,
            'lead_source' => LeadSource::class,
            'note' => Note::class,
            'pipeline' => Pipeline::class,
            'pipeline_stage' => PipelineStage::class,
            'tag' => Tag::class,
            'team' => Team::class,
            'team_closure' => TeamClosure::class,
            'user' => User::class,
            'workspace' => Workspace::class,
            'workspace_member' => WorkspaceMember::class,
            'workspace_sequence' => WorkspaceSequence::class,
            'workspace_setting' => WorkspaceSetting::class,
        ];

        Relation::enforceMorphMap($map);
    }
}
