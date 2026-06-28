<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Legacy namespace aliases (transition shim)
|--------------------------------------------------------------------------
|
| Phase 1a moved the foundation modules (identity, tenancy, shared) from
| Modules\{...} into the standard App\ namespace. Hundreds of callers in
| not-yet-migrated modules still reference the old Modules\ class names.
| These class_alias() calls keep those callers resolving to the moved
| classes. They are removed in a later phase once every Modules\ reference
| has been rewritten to App\.
|
| ServiceProviders are intentionally NOT aliased: ModuleServiceProvider
| skips providers whose old class no longer exists, so aliasing them would
| cause a duplicate registration.
|
| NEVER use extends for this shim — subclassing a model with a morph alias
| throws ClassMorphViolationException.
*/

class_alias(\App\Enums\PlatformPermission::class, 'Modules\Identity\Enums\PlatformPermission');
class_alias(\App\Enums\PlatformRole::class, 'Modules\Identity\Enums\PlatformRole');
class_alias(\App\Enums\TenantPermission::class, 'Modules\Identity\Enums\TenantPermission');
class_alias(\App\Http\Controllers\Identity\Admin\Auth\AuthenticatedSessionController::class, 'Modules\Identity\Http\Controllers\Admin\Auth\AuthenticatedSessionController');
class_alias(\App\Http\Controllers\Identity\Admin\Auth\NewPasswordController::class, 'Modules\Identity\Http\Controllers\Admin\Auth\NewPasswordController');
class_alias(\App\Http\Controllers\Identity\Admin\Auth\PasswordResetLinkController::class, 'Modules\Identity\Http\Controllers\Admin\Auth\PasswordResetLinkController');
class_alias(\App\Http\Controllers\Identity\Admin\DashboardController::class, 'Modules\Identity\Http\Controllers\Admin\DashboardController');
class_alias(\App\Http\Controllers\Identity\Admin\ImpersonationController::class, 'Modules\Identity\Http\Controllers\Admin\ImpersonationController');
class_alias(\App\Http\Controllers\Identity\Admin\WorkspaceController::class, 'Modules\Identity\Http\Controllers\Admin\WorkspaceController');
class_alias(\App\Http\Controllers\Identity\Auth\AuthenticatedSessionController::class, 'Modules\Identity\Http\Controllers\Auth\AuthenticatedSessionController');
class_alias(\App\Http\Controllers\Identity\Auth\ConfirmablePasswordController::class, 'Modules\Identity\Http\Controllers\Auth\ConfirmablePasswordController');
class_alias(\App\Http\Controllers\Identity\Auth\EmailVerificationNotificationController::class, 'Modules\Identity\Http\Controllers\Auth\EmailVerificationNotificationController');
class_alias(\App\Http\Controllers\Identity\Auth\EmailVerificationPromptController::class, 'Modules\Identity\Http\Controllers\Auth\EmailVerificationPromptController');
class_alias(\App\Http\Controllers\Identity\Auth\NewPasswordController::class, 'Modules\Identity\Http\Controllers\Auth\NewPasswordController');
class_alias(\App\Http\Controllers\Identity\Auth\PasswordResetLinkController::class, 'Modules\Identity\Http\Controllers\Auth\PasswordResetLinkController');
class_alias(\App\Http\Controllers\Identity\Auth\RegisteredUserController::class, 'Modules\Identity\Http\Controllers\Auth\RegisteredUserController');
class_alias(\App\Http\Controllers\Identity\Auth\VerifyEmailController::class, 'Modules\Identity\Http\Controllers\Auth\VerifyEmailController');
class_alias(\App\Http\Controllers\Identity\Settings\MemberController::class, 'Modules\Identity\Http\Controllers\Settings\MemberController');
class_alias(\App\Http\Controllers\Identity\Settings\PasswordController::class, 'Modules\Identity\Http\Controllers\Settings\PasswordController');
class_alias(\App\Http\Controllers\Identity\Settings\ProfileController::class, 'Modules\Identity\Http\Controllers\Settings\ProfileController');
class_alias(\App\Http\Controllers\Identity\Settings\TeamController::class, 'Modules\Identity\Http\Controllers\Settings\TeamController');
class_alias(\App\Http\Middleware\AdminCan::class, 'Modules\Identity\Http\Middleware\AdminCan');
class_alias(\App\Http\Middleware\BindAdminPermissionScope::class, 'Modules\Identity\Http\Middleware\BindAdminPermissionScope');
class_alias(\App\Http\Middleware\BlockDuringImpersonation::class, 'Modules\Identity\Http\Middleware\BlockDuringImpersonation');
class_alias(\App\Models\Admin::class, 'Modules\Identity\Models\Admin');
class_alias(\App\Models\AuditLog::class, 'Modules\Identity\Models\AuditLog');
class_alias(\App\Models\Concerns\Auditable::class, 'Modules\Identity\Models\Concerns\Auditable');
class_alias(\App\Models\Team::class, 'Modules\Identity\Models\Team');
class_alias(\App\Models\TeamClosure::class, 'Modules\Identity\Models\TeamClosure');
class_alias(\App\Models\User::class, 'Modules\Identity\Models\User');
class_alias(\App\Policies\TeamPolicy::class, 'Modules\Identity\Policies\TeamPolicy');
class_alias(\App\Services\MembershipService::class, 'Modules\Identity\Services\MembershipService');
class_alias(\App\Services\TeamService::class, 'Modules\Identity\Services\TeamService');
class_alias(\App\Support\Audit\Audit::class, 'Modules\Identity\Support\Audit\Audit');
class_alias(\App\Support\Visibility::class, 'Modules\Identity\Support\Visibility');
class_alias(\App\Models\Concerns\HasActivities::class, 'Modules\Shared\Concerns\HasActivities');
class_alias(\App\Models\Concerns\HasAttachments::class, 'Modules\Shared\Concerns\HasAttachments');
class_alias(\App\Models\Concerns\HasComments::class, 'Modules\Shared\Concerns\HasComments');
class_alias(\App\Models\Concerns\HasCustomFields::class, 'Modules\Shared\Concerns\HasCustomFields');
class_alias(\App\Models\Concerns\HasNotes::class, 'Modules\Shared\Concerns\HasNotes');
class_alias(\App\Models\Concerns\HasOptimisticLock::class, 'Modules\Shared\Concerns\HasOptimisticLock');
class_alias(\App\Models\Concerns\HasReminders::class, 'Modules\Shared\Concerns\HasReminders');
class_alias(\App\Models\Concerns\HasTags::class, 'Modules\Shared\Concerns\HasTags');
class_alias(\App\Http\Controllers\Shared\AttachmentController::class, 'Modules\Shared\Http\Controllers\AttachmentController');
class_alias(\App\Http\Controllers\Shared\CommentController::class, 'Modules\Shared\Http\Controllers\CommentController');
class_alias(\App\Http\Controllers\Shared\NoteController::class, 'Modules\Shared\Http\Controllers\NoteController');
class_alias(\App\Http\Controllers\Shared\NotificationController::class, 'Modules\Shared\Http\Controllers\NotificationController');
class_alias(\App\Http\Controllers\Shared\ReminderController::class, 'Modules\Shared\Http\Controllers\ReminderController');
class_alias(\App\Http\Controllers\Shared\Settings\CustomFieldController::class, 'Modules\Shared\Http\Controllers\Settings\CustomFieldController');
class_alias(\App\Http\Controllers\Shared\TagController::class, 'Modules\Shared\Http\Controllers\TagController');
class_alias(\App\Models\Activity::class, 'Modules\Shared\Models\Activity');
class_alias(\App\Models\Attachment::class, 'Modules\Shared\Models\Attachment');
class_alias(\App\Models\Comment::class, 'Modules\Shared\Models\Comment');
class_alias(\App\Models\CustomFieldDefinition::class, 'Modules\Shared\Models\CustomFieldDefinition');
class_alias(\App\Models\Note::class, 'Modules\Shared\Models\Note');
class_alias(\App\Models\Reminder::class, 'Modules\Shared\Models\Reminder');
class_alias(\App\Models\Tag::class, 'Modules\Shared\Models\Tag');
class_alias(\App\Policies\ActivityPolicy::class, 'Modules\Shared\Policies\ActivityPolicy');
class_alias(\App\Policies\AttachmentPolicy::class, 'Modules\Shared\Policies\AttachmentPolicy');
class_alias(\App\Policies\CommentPolicy::class, 'Modules\Shared\Policies\CommentPolicy');
class_alias(\App\Policies\CustomFieldDefinitionPolicy::class, 'Modules\Shared\Policies\CustomFieldDefinitionPolicy');
class_alias(\App\Policies\NotePolicy::class, 'Modules\Shared\Policies\NotePolicy');
class_alias(\App\Policies\ReminderPolicy::class, 'Modules\Shared\Policies\ReminderPolicy');
class_alias(\App\Services\AttachmentService::class, 'Modules\Shared\Services\AttachmentService');
class_alias(\App\Services\CommentService::class, 'Modules\Shared\Services\CommentService');
class_alias(\App\Services\CustomFieldService::class, 'Modules\Shared\Services\CustomFieldService');
class_alias(\App\Services\NoteService::class, 'Modules\Shared\Services\NoteService');
class_alias(\App\Services\NotificationService::class, 'Modules\Shared\Services\NotificationService');
class_alias(\App\Services\ReminderService::class, 'Modules\Shared\Services\ReminderService');
class_alias(\App\Services\TagService::class, 'Modules\Shared\Services\TagService');
class_alias(\App\Support\Activity\ActivityFormatter::class, 'Modules\Shared\Support\Activity\ActivityFormatter');
class_alias(\App\Support\Activity\ActivityLogger::class, 'Modules\Shared\Support\Activity\ActivityLogger');
class_alias(\App\Models\Concerns\BelongsToWorkspace::class, 'Modules\Tenancy\Concerns\BelongsToWorkspace');
class_alias(\App\Http\Controllers\Tenancy\Settings\WorkspaceController::class, 'Modules\Tenancy\Http\Controllers\Settings\WorkspaceController');
class_alias(\App\Http\Controllers\Tenancy\WorkspaceSwitchController::class, 'Modules\Tenancy\Http\Controllers\WorkspaceSwitchController');
class_alias(\App\Http\Middleware\IdentifyWorkspace::class, 'Modules\Tenancy\Http\Middleware\IdentifyWorkspace');
class_alias(\App\Http\Middleware\ResetTenantContext::class, 'Modules\Tenancy\Http\Middleware\ResetTenantContext');
class_alias(\App\Models\Workspace::class, 'Modules\Tenancy\Models\Workspace');
class_alias(\App\Models\WorkspaceMember::class, 'Modules\Tenancy\Models\WorkspaceMember');
class_alias(\App\Models\WorkspaceSequence::class, 'Modules\Tenancy\Models\WorkspaceSequence');
class_alias(\App\Models\WorkspaceSetting::class, 'Modules\Tenancy\Models\WorkspaceSetting');
class_alias(\App\Policies\WorkspaceMemberPolicy::class, 'Modules\Tenancy\Policies\WorkspaceMemberPolicy');
class_alias(\App\Policies\WorkspacePolicy::class, 'Modules\Tenancy\Policies\WorkspacePolicy');
class_alias(\App\Services\SettingsService::class, 'Modules\Tenancy\Services\SettingsService');
class_alias(\App\Services\WorkspaceProvisioningService::class, 'Modules\Tenancy\Services\WorkspaceProvisioningService');
class_alias(\App\Support\TenantScope::class, 'Modules\Tenancy\Support\TenantScope');
