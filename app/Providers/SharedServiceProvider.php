<?php

namespace App\Providers;

use App\Models\Activity;
use App\Models\Attachment;
use App\Models\Comment;
use App\Models\CustomFieldDefinition;
use App\Models\Note;
use App\Models\Reminder;
use App\Policies\ActivityPolicy;
use App\Policies\AttachmentPolicy;
use App\Policies\CommentPolicy;
use App\Policies\CustomFieldDefinitionPolicy;
use App\Policies\NotePolicy;
use App\Policies\ReminderPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Shared service provider.
 *
 * Registers policies for the shared models (attachments, tags, comments,
 * notes, activities, reminders, custom fields).
 *
 * Migrations live in database/migrations/ (Laravel auto-discovers them).
 * Depends on: tenancy (BelongsToWorkspace), identity (Auditable, User).
 */
class SharedServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Activity::class, ActivityPolicy::class);
        Gate::policy(Attachment::class, AttachmentPolicy::class);
        Gate::policy(Comment::class, CommentPolicy::class);
        Gate::policy(CustomFieldDefinition::class, CustomFieldDefinitionPolicy::class);
        Gate::policy(Note::class, NotePolicy::class);
        Gate::policy(Reminder::class, ReminderPolicy::class);
    }
}
