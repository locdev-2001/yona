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
use App\Models\Conversation;
use App\Models\CustomFieldDefinition;
use App\Models\EmailTemplate;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Note;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Project;
use App\Models\ProjectDiscussion;
use App\Models\ProjectMilestone;
use App\Models\ProjectStatus;
use App\Models\Reminder;
use App\Models\Tag;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskTimer;
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
            'lead' => Lead::class,

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
            'conversation' => Conversation::class,
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
