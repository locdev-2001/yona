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

// Phase 1b — CRM Sales moved from Modules\CrmSales\* → App\*
// External callers (inbox/projects/cdp/tests) still use Modules\CrmSales\... — aliases resolve them.
// ServiceProvider intentionally NOT aliased (ModuleServiceProvider skips via class_exists check).
class_alias(\App\Models\Client::class, 'Modules\CrmSales\Models\Client');
class_alias(\App\Models\ClientGroup::class, 'Modules\CrmSales\Models\ClientGroup');
class_alias(\App\Models\ClientGroupPivot::class, 'Modules\CrmSales\Models\ClientGroupPivot');
class_alias(\App\Models\ClientUserPivot::class, 'Modules\CrmSales\Models\ClientUserPivot');
class_alias(\App\Models\ClientVaultEntry::class, 'Modules\CrmSales\Models\ClientVaultEntry');
class_alias(\App\Models\Contact::class, 'Modules\CrmSales\Models\Contact');
class_alias(\App\Models\Lead::class, 'Modules\CrmSales\Models\Lead');
class_alias(\App\Models\LeadSource::class, 'Modules\CrmSales\Models\LeadSource');
class_alias(\App\Models\Pipeline::class, 'Modules\CrmSales\Models\Pipeline');
class_alias(\App\Models\PipelineStage::class, 'Modules\CrmSales\Models\PipelineStage');
class_alias(\App\Services\ClientService::class, 'Modules\CrmSales\Services\ClientService');
class_alias(\App\Services\ClientVaultService::class, 'Modules\CrmSales\Services\ClientVaultService');
class_alias(\App\Services\LeadConversionService::class, 'Modules\CrmSales\Services\LeadConversionService');
class_alias(\App\Services\LeadService::class, 'Modules\CrmSales\Services\LeadService');
class_alias(\App\Services\LookupService::class, 'Modules\CrmSales\Services\LookupService');
class_alias(\App\Policies\ClientPolicy::class, 'Modules\CrmSales\Policies\ClientPolicy');
class_alias(\App\Policies\ContactPolicy::class, 'Modules\CrmSales\Policies\ContactPolicy');
class_alias(\App\Policies\LeadPolicy::class, 'Modules\CrmSales\Policies\LeadPolicy');
class_alias(\App\Policies\LeadSourcePolicy::class, 'Modules\CrmSales\Policies\LeadSourcePolicy');
class_alias(\App\Policies\PipelinePolicy::class, 'Modules\CrmSales\Policies\PipelinePolicy');
class_alias(\App\Events\LeadAssigned::class, 'Modules\CrmSales\Events\LeadAssigned');
class_alias(\App\Events\LeadConverted::class, 'Modules\CrmSales\Events\LeadConverted');
class_alias(\App\Events\LeadCreated::class, 'Modules\CrmSales\Events\LeadCreated');
class_alias(\App\Events\LeadStageChanged::class, 'Modules\CrmSales\Events\LeadStageChanged');
class_alias(\App\Listeners\SendLeadAssignedNotification::class, 'Modules\CrmSales\Listeners\SendLeadAssignedNotification');
class_alias(\App\Notifications\LeadAssignedNotification::class, 'Modules\CrmSales\Notifications\LeadAssignedNotification');
class_alias(\App\Services\MergeFields\LeadMergeFields::class, 'Modules\CrmSales\MergeFields\LeadMergeFields');
class_alias(\App\Services\MergeFields\ClientMergeFields::class, 'Modules\CrmSales\MergeFields\ClientMergeFields');
class_alias(\App\Services\MergeFields\ContactMergeFields::class, 'Modules\CrmSales\MergeFields\ContactMergeFields');
class_alias(\App\Http\Controllers\Crm\Clients\ClientController::class, 'Modules\CrmSales\Http\Controllers\Clients\ClientController');
class_alias(\App\Http\Controllers\Crm\Clients\ClientCustomerAdminController::class, 'Modules\CrmSales\Http\Controllers\Clients\ClientCustomerAdminController');
class_alias(\App\Http\Controllers\Crm\Clients\ClientGroupController::class, 'Modules\CrmSales\Http\Controllers\Clients\ClientGroupController');
class_alias(\App\Http\Controllers\Crm\Clients\ClientVaultEntryController::class, 'Modules\CrmSales\Http\Controllers\Clients\ClientVaultEntryController');
class_alias(\App\Http\Controllers\Crm\Clients\ContactController::class, 'Modules\CrmSales\Http\Controllers\Clients\ContactController');
class_alias(\App\Http\Controllers\Crm\Leads\LeadController::class, 'Modules\CrmSales\Http\Controllers\Leads\LeadController');
class_alias(\App\Http\Controllers\Crm\Leads\LeadConversionController::class, 'Modules\CrmSales\Http\Controllers\Leads\LeadConversionController');
class_alias(\App\Http\Controllers\Crm\Leads\LeadStageController::class, 'Modules\CrmSales\Http\Controllers\Leads\LeadStageController');
class_alias(\App\Http\Controllers\Crm\Leads\LeadStatusActionController::class, 'Modules\CrmSales\Http\Controllers\Leads\LeadStatusActionController');
class_alias(\App\Http\Controllers\Crm\Settings\LeadSourceController::class, 'Modules\CrmSales\Http\Controllers\Settings\LeadSourceController');
class_alias(\App\Http\Controllers\Crm\Settings\PipelineController::class, 'Modules\CrmSales\Http\Controllers\Settings\PipelineController');
class_alias(\App\Http\Controllers\Crm\Settings\PipelineStageController::class, 'Modules\CrmSales\Http\Controllers\Settings\PipelineStageController');

// Phase 1c — Projects moved from Modules\Projects\* → App\*
// External callers (tests, MorphMap) still use Modules\Projects\... — aliases resolve them.
// ServiceProvider intentionally NOT aliased.
class_alias(\App\Models\Project::class, 'Modules\Projects\Models\Project');
class_alias(\App\Models\ProjectDiscussion::class, 'Modules\Projects\Models\ProjectDiscussion');
class_alias(\App\Models\ProjectMember::class, 'Modules\Projects\Models\ProjectMember');
class_alias(\App\Models\ProjectMilestone::class, 'Modules\Projects\Models\ProjectMilestone');
class_alias(\App\Models\ProjectStatus::class, 'Modules\Projects\Models\ProjectStatus');
class_alias(\App\Models\Task::class, 'Modules\Projects\Models\Task');
class_alias(\App\Models\TaskAssignee::class, 'Modules\Projects\Models\TaskAssignee');
class_alias(\App\Models\TaskChecklistItem::class, 'Modules\Projects\Models\TaskChecklistItem');
class_alias(\App\Models\TaskFollower::class, 'Modules\Projects\Models\TaskFollower');
class_alias(\App\Models\TaskTimer::class, 'Modules\Projects\Models\TaskTimer');
class_alias(\App\Services\ProjectDiscussionService::class, 'Modules\Projects\Services\ProjectDiscussionService');
class_alias(\App\Services\ProjectMilestoneService::class, 'Modules\Projects\Services\ProjectMilestoneService');
class_alias(\App\Services\ProjectService::class, 'Modules\Projects\Services\ProjectService');
class_alias(\App\Services\TaskService::class, 'Modules\Projects\Services\TaskService');
class_alias(\App\Services\TaskTimerService::class, 'Modules\Projects\Services\TaskTimerService');
class_alias(\App\Policies\ProjectPolicy::class, 'Modules\Projects\Policies\ProjectPolicy');
class_alias(\App\Policies\ProjectStatusPolicy::class, 'Modules\Projects\Policies\ProjectStatusPolicy');
class_alias(\App\Policies\TaskPolicy::class, 'Modules\Projects\Policies\TaskPolicy');
class_alias(\App\Http\Controllers\Projects\Projects\ProjectController::class, 'Modules\Projects\Http\Controllers\Projects\ProjectController');
class_alias(\App\Http\Controllers\Projects\Projects\ProjectDiscussionController::class, 'Modules\Projects\Http\Controllers\Projects\ProjectDiscussionController');
class_alias(\App\Http\Controllers\Projects\Projects\ProjectFileController::class, 'Modules\Projects\Http\Controllers\Projects\ProjectFileController');
class_alias(\App\Http\Controllers\Projects\Projects\ProjectMemberController::class, 'Modules\Projects\Http\Controllers\Projects\ProjectMemberController');
class_alias(\App\Http\Controllers\Projects\Projects\ProjectMilestoneController::class, 'Modules\Projects\Http\Controllers\Projects\ProjectMilestoneController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskAssigneeController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskAssigneeController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskChecklistController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskChecklistController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskKanbanController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskKanbanController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskStatusController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskStatusController');
class_alias(\App\Http\Controllers\Projects\Tasks\TaskTimerController::class, 'Modules\Projects\Http\Controllers\Tasks\TaskTimerController');
class_alias(\App\Http\Controllers\Projects\Settings\ProjectStatusController::class, 'Modules\Projects\Http\Controllers\Settings\ProjectStatusController');

// Phase 1d — Email moved from Modules\Email\* → App\*
// External callers (inbox/billing/cdp) still use Modules\Email\... — aliases resolve them.
// ServiceProvider intentionally NOT aliased.
class_alias(\App\Contracts\EntityMergeFields::class, 'Modules\Email\Contracts\EntityMergeFields');
class_alias(\App\Models\EmailTemplate::class, 'Modules\Email\Models\EmailTemplate');
class_alias(\App\Policies\EmailTemplatePolicy::class, 'Modules\Email\Policies\EmailTemplatePolicy');
class_alias(\App\Services\EmailTemplateService::class, 'Modules\Email\Services\EmailTemplateService');
class_alias(\App\Services\MergeFieldResolver::class, 'Modules\Email\Services\MergeFieldResolver');
class_alias(\App\Services\TemplatedMailer::class, 'Modules\Email\Services\TemplatedMailer');
class_alias(\App\Http\Controllers\Email\EmailTemplateController::class, 'Modules\Email\Http\Controllers\Settings\EmailTemplateController');
class_alias(\App\Http\Requests\Email\EmailTemplateUpdateRequest::class, 'Modules\Email\Http\Requests\Settings\EmailTemplateUpdateRequest');
class_alias(\App\Http\Requests\Email\EmailTemplateTestRequest::class, 'Modules\Email\Http\Requests\Settings\EmailTemplateTestRequest');

// Phase 1d — Announcements moved from Modules\Announcements\* → App\*
// External callers still use Modules\Announcements\... — aliases resolve them.
// ServiceProvider intentionally NOT aliased.
class_alias(\App\Enums\AnnouncementAudience::class, 'Modules\Announcements\Enums\AnnouncementAudience');
class_alias(\App\Enums\AnnouncementCategory::class, 'Modules\Announcements\Enums\AnnouncementCategory');
class_alias(\App\Enums\AnnouncementStatus::class, 'Modules\Announcements\Enums\AnnouncementStatus');
class_alias(\App\Models\Announcement::class, 'Modules\Announcements\Models\Announcement');
class_alias(\App\Models\AnnouncementRead::class, 'Modules\Announcements\Models\AnnouncementRead');
class_alias(\App\Policies\AnnouncementPolicy::class, 'Modules\Announcements\Policies\AnnouncementPolicy');
class_alias(\App\Rules\AnnouncementAudienceRule::class, 'Modules\Announcements\Rules\AnnouncementAudienceRule');
class_alias(\App\Services\AnnouncementReadService::class, 'Modules\Announcements\Services\AnnouncementReadService');
class_alias(\App\Services\AnnouncementService::class, 'Modules\Announcements\Services\AnnouncementService');
class_alias(\App\Support\AnnouncementMarkdown::class, 'Modules\Announcements\Support\AnnouncementMarkdown');
class_alias(\App\Support\AudienceResolver::class, 'Modules\Announcements\Support\AudienceResolver');
class_alias(\App\Http\Controllers\Announcements\AnnouncementReadController::class, 'Modules\Announcements\Http\Controllers\AnnouncementReadController');
class_alias(\App\Http\Controllers\Announcements\WhatsNewController::class, 'Modules\Announcements\Http\Controllers\WhatsNewController');
class_alias(\App\Http\Controllers\Announcements\Admin\AnnouncementController::class, 'Modules\Announcements\Http\Controllers\Admin\AnnouncementController');
class_alias(\App\Http\Controllers\Announcements\Admin\AnnouncementPublishController::class, 'Modules\Announcements\Http\Controllers\Admin\AnnouncementPublishController');
class_alias(\App\Http\Requests\Announcements\Admin\AnnouncementStoreRequest::class, 'Modules\Announcements\Http\Requests\Admin\AnnouncementStoreRequest');
class_alias(\App\Http\Requests\Announcements\Admin\AnnouncementUpdateRequest::class, 'Modules\Announcements\Http\Requests\Admin\AnnouncementUpdateRequest');

// Phase 2a — Inbox-core moved from Modules\Inbox\* → App\* (models/services/events/policy)
// + ChannelManager/ChannelDriver → App\Modules\Integration\*.
// External callers (channel-zalo source + tests) still use Modules\Inbox\... — aliases resolve them.
// MeteringGate interface + AllowAllMeteringGate DELETED (no alias — billing là CORE concrete).
// ServiceProvider intentionally NOT aliased.
class_alias(\App\Models\Conversation::class, 'Modules\Inbox\Models\Conversation');
class_alias(\App\Models\Message::class, 'Modules\Inbox\Models\Message');
class_alias(\App\Services\InboundMessageService::class, 'Modules\Inbox\Services\InboundMessageService');
class_alias(\App\Events\MessageReceived::class, 'Modules\Inbox\Events\MessageReceived');
class_alias(\App\Policies\ConversationPolicy::class, 'Modules\Inbox\Policies\ConversationPolicy');
class_alias(\App\Exceptions\QuotaExceededException::class, 'Modules\Inbox\Exceptions\QuotaExceededException');
class_alias(\App\Contracts\SendException::class, 'Modules\Inbox\Contracts\SendException');
// Internal-first: ChannelManager/ChannelDriver sống trong app/Modules/Integration/.
// Xóa thư mục đó → guard class_exists/interface_exists để KHÔNG fatal khi alias.
// (Dùng string literal, KHÔNG ::class — ::class ép autoload class đã bị xóa → fatal.)
if (class_exists('App\Modules\Integration\ChannelManager')) {
    class_alias('App\Modules\Integration\ChannelManager', 'Modules\Inbox\Channel\ChannelManager');
}
if (interface_exists('App\Modules\Integration\Contracts\ChannelDriver')) {
    class_alias('App\Modules\Integration\Contracts\ChannelDriver', 'Modules\Inbox\Contracts\ChannelDriver');
}

// Phase 2b — billing moved from Modules\Billing\* → App\* (models/services/observers/enums/middleware/controller)
// + PaymentManager/PaymentDriver → App\Modules\Integration\*.
// External callers (payment-manual source + tests) still use Modules\Billing\... — aliases resolve them.
// EntitlementResolver renamed → EntitlementService (alias both old names).
// QuotaExceededException: billing's version (channel+quotaKey params) differs from App\ (simple msg).
//   Alias Modules\Billing\Exceptions\QuotaExceededException → App\Exceptions\QuotaExceededException
//   (callers that only catch it still work; callers that construct it with channel/quotaKey args must use
//   App\Exceptions\QuotaExceededException directly — MeteringService already does this).
// ServiceProvider intentionally NOT aliased.
class_alias(\App\Models\MarketplaceItem::class, 'Modules\Billing\Models\MarketplaceItem');
class_alias(\App\Models\WorkspacePurchase::class, 'Modules\Billing\Models\WorkspacePurchase');
class_alias(\App\Models\ChannelUsage::class, 'Modules\Billing\Models\ChannelUsage');
class_alias(\App\Services\EntitlementService::class, 'Modules\Billing\Services\EntitlementResolver');
class_alias(\App\Services\EntitlementService::class, 'Modules\Billing\Services\EntitlementService');
class_alias(\App\Services\GrantPlanService::class, 'Modules\Billing\Services\GrantPlanService');
class_alias(\App\Observers\WorkspacePurchaseObserver::class, 'Modules\Billing\Observers\WorkspacePurchaseObserver');
class_alias(\App\Enums\TenantEntitlement::class, 'Modules\Billing\Enums\TenantEntitlement');
class_alias(\App\Exceptions\QuotaExceededException::class, 'Modules\Billing\Exceptions\QuotaExceededException');
class_alias(\App\Http\Middleware\EnsureEntitled::class, 'Modules\Billing\Http\Middleware\EnsureEntitled');
class_alias(\App\Http\Controllers\Billing\Admin\WorkspacePlanController::class, 'Modules\Billing\Http\Controllers\Admin\WorkspacePlanController');
// Internal-first: PaymentManager/PaymentDriver sống trong app/Modules/Integration/.
// Xóa thư mục đó → guard class_exists/interface_exists để KHÔNG fatal khi alias.
if (class_exists('App\Modules\Integration\PaymentManager')) {
    class_alias('App\Modules\Integration\PaymentManager', 'Modules\Billing\Services\PaymentManager');
}
if (interface_exists('App\Modules\Integration\Contracts\PaymentDriver')) {
    class_alias('App\Modules\Integration\Contracts\PaymentDriver', 'Modules\Billing\Contracts\PaymentProvider');
    class_alias('App\Modules\Integration\Contracts\PaymentDriver', 'Modules\Billing\Contracts\PaymentDriver');
}
