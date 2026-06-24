<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Admin;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\ClientVaultEntry;
use App\Models\Comment;
use App\Models\Contact;
use App\Models\CustomFieldDefinition;
use App\Models\EmailTemplate;
use App\Models\LeadSource;
use App\Models\Note;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\ProjectStatus;
use App\Models\Reminder;
use App\Models\Tag;
use App\Models\Team;
use App\Models\TeamClosure;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use App\Models\WorkspaceSequence;
use App\Models\WorkspaceSetting;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

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
 *
 * M1 classes (client/contact/lead/project/task) are declared as strings - they
 * do not exist at P03 build time. The map is string->FQCN only; classes are NOT
 * autoloaded at boot and are resolved lazily at query time. CI for P03 does not
 * touch M1 classes, so the build does not fail. (G3)
 */
class MorphMapServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /** @var array<string, class-string> $map */
        $map = [
            // P03 canonical entity aliases (G3 - single source shared with custom_field entity_type).
            'client' => Client::class,             // P06 — now exists
            'contact' => Contact::class,           // P06 — now exists
            'client_group' => ClientGroup::class,  // P06 — additional model
            'client_vault_entry' => ClientVaultEntry::class, // P06 — additional model
            'lead' => 'App\\Models\\Lead',     // P07
            'project' => 'App\\Models\\Project',             // P08
            'project_milestone' => 'App\\Models\\ProjectMilestone', // P08
            'project_discussion' => 'App\\Models\\ProjectDiscussion', // P08
            'task' => 'App\\Models\\Task',                               // P09
            'task_checklist_item' => 'App\\Models\\TaskChecklistItem', // P09
            'task_timer' => 'App\\Models\\TaskTimer',                  // P09

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
            'project_status' => ProjectStatus::class,
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
