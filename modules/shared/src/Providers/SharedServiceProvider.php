<?php

namespace Modules\Shared\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Shared\Models\Activity;
use Modules\Shared\Models\Attachment;
use Modules\Shared\Models\Comment;
use Modules\Shared\Models\CustomFieldDefinition;
use Modules\Shared\Models\Note;
use Modules\Shared\Models\Reminder;
use Modules\Shared\Policies\ActivityPolicy;
use Modules\Shared\Policies\AttachmentPolicy;
use Modules\Shared\Policies\CommentPolicy;
use Modules\Shared\Policies\CustomFieldDefinitionPolicy;
use Modules\Shared\Policies\NotePolicy;
use Modules\Shared\Policies\ReminderPolicy;

/**
 * Shared core module service provider.
 *
 * Loads:
 *  - Migrations: custom_field_definitions, attachments, tags, taggables,
 *    comments, notes, activities, reminders, notifications + their RLS policies.
 *  - Policies: for all shared models.
 *
 * Depends on: tenancy (BelongsToWorkspace), identity (Auditable, User).
 */
class SharedServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // No module-specific container bindings — services are resolved via DI.
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        Gate::policy(Activity::class, ActivityPolicy::class);
        Gate::policy(Attachment::class, AttachmentPolicy::class);
        Gate::policy(Comment::class, CommentPolicy::class);
        Gate::policy(CustomFieldDefinition::class, CustomFieldDefinitionPolicy::class);
        Gate::policy(Note::class, NotePolicy::class);
        Gate::policy(Reminder::class, ReminderPolicy::class);
    }
}
