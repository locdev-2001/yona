<?php

use App\Http\Controllers\Announcements\Admin\AnnouncementController;
use App\Http\Controllers\Announcements\Admin\AnnouncementPublishController;
use App\Http\Controllers\Announcements\AnnouncementReadController;
use App\Http\Controllers\Announcements\WhatsNewController;
use App\Http\Controllers\Billing\Admin\WorkspacePlanController;
use App\Http\Controllers\Crm\Clients\ClientController;
use App\Http\Controllers\Crm\Clients\ClientCustomerAdminController;
use App\Http\Controllers\Crm\Clients\ClientGroupController;
use App\Http\Controllers\Crm\Clients\ClientVaultEntryController;
use App\Http\Controllers\Crm\Clients\ContactController;
use App\Http\Controllers\Crm\Leads\LeadController;
use App\Http\Controllers\Crm\Leads\LeadConversionController;
use App\Http\Controllers\Crm\Leads\LeadStageController;
use App\Http\Controllers\Crm\Leads\LeadStatusActionController;
use App\Http\Controllers\Crm\Settings\LeadSourceController;
use App\Http\Controllers\Crm\Settings\PipelineController;
use App\Http\Controllers\Crm\Settings\PipelineStageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Email\EmailTemplateController;
use App\Http\Controllers\Identity\Admin\ImpersonationController;
use App\Http\Controllers\Identity\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Identity\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Identity\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Identity\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Identity\Auth\NewPasswordController;
use App\Http\Controllers\Identity\Auth\PasswordResetLinkController;
use App\Http\Controllers\Identity\Auth\RegisteredUserController;
use App\Http\Controllers\Identity\Auth\VerifyEmailController;
use App\Http\Controllers\Identity\Settings\MemberController;
use App\Http\Controllers\Identity\Settings\PasswordController;
use App\Http\Controllers\Identity\Settings\ProfileController;
use App\Http\Controllers\Identity\Settings\TeamController;
use App\Http\Controllers\Inbox\ConversationAttachmentController;
use App\Http\Controllers\Inbox\ConversationLeadController;
use App\Http\Controllers\Inbox\ConversationPhoneController;
use App\Http\Controllers\Inbox\ConversationStreamController;
use App\Http\Controllers\Inbox\InboxController;
use App\Http\Controllers\Inbox\MessageInteractionController;
use App\Http\Controllers\Integration\IntegrationController;
use App\Http\Controllers\Integration\ZaloConnectionController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Projects\Projects\ProjectController;
use App\Http\Controllers\Projects\Projects\ProjectDiscussionController;
use App\Http\Controllers\Projects\Projects\ProjectFileController;
use App\Http\Controllers\Projects\Projects\ProjectMemberController;
use App\Http\Controllers\Projects\Projects\ProjectMilestoneController;
use App\Http\Controllers\Projects\Settings\ProjectStatusController;
use App\Http\Controllers\Projects\Tasks\TaskAssigneeController;
use App\Http\Controllers\Projects\Tasks\TaskChecklistController;
use App\Http\Controllers\Projects\Tasks\TaskController;
use App\Http\Controllers\Projects\Tasks\TaskKanbanController;
use App\Http\Controllers\Projects\Tasks\TaskStatusController;
use App\Http\Controllers\Projects\Tasks\TaskTimerController;
use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Shared\AttachmentController;
use App\Http\Controllers\Shared\CommentController;
use App\Http\Controllers\Shared\NoteController;
use App\Http\Controllers\Shared\NotificationController;
use App\Http\Controllers\Shared\ReminderController;
use App\Http\Controllers\Shared\Settings\CustomFieldController;
use App\Http\Controllers\Shared\TagController;
use App\Http\Controllers\Tenancy\Settings\WorkspaceController;
use App\Http\Controllers\Tenancy\WorkspaceSwitchController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    // Switch active workspace (validated against the user's memberships).
    Route::post('workspaces/{workspace}/switch', WorkspaceSwitchController::class)->name('workspaces.switch');

    // Workspace-scoped app screens require an active membership (IdentifyWorkspace).
    Route::middleware('workspace')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        // P03 — Attachments (polymorphic, download via key not uuid).
        Route::post('attachments', [AttachmentController::class, 'store'])->name('attachments.store');
        Route::get('attachments/{attachmentKey}/download', [AttachmentController::class, 'download'])->name('attachments.download');
        Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

        // P03 — Tags (workspace autocomplete + entity sync).
        Route::get('tags', [TagController::class, 'index'])->name('tags.index');
        Route::post('tags/sync', [TagController::class, 'sync'])->name('tags.sync');

        // P03 — Comments (polymorphic thread).
        Route::post('comments', [CommentController::class, 'store'])->name('comments.store');
        Route::put('comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
        Route::delete('comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

        // P03 — Notes (internal staff, polymorphic).
        Route::post('notes', [NoteController::class, 'store'])->name('notes.store');
        Route::put('notes/{note}', [NoteController::class, 'update'])->name('notes.update');
        Route::delete('notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');

        // P04 — Reminders (polymorphic, workspace-scoped).
        Route::post('reminders', [ReminderController::class, 'store'])->name('reminders.store');
        Route::put('reminders/{reminder}', [ReminderController::class, 'update'])->name('reminders.update');
        Route::delete('reminders/{reminder}', [ReminderController::class, 'destroy'])->name('reminders.destroy');

        // P04 — In-app notifications (global, scoped by notifiable user).
        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
        Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

        // P07 — Leads + Pipeline.
        Route::resource('leads', LeadController::class);
        Route::get('leads-kanban/{pipeline?}', [LeadController::class, 'kanban'])->name('leads.kanban');
        Route::patch('leads/{lead}/stage', [LeadStageController::class, 'update'])->name('leads.stage');
        Route::post('leads/{lead}/assign', [LeadController::class, 'assign'])->name('leads.assign');
        Route::post('leads/{lead}/convert', [LeadConversionController::class, 'store'])->name('leads.convert');
        Route::post('leads/{lead}/lost', [LeadStatusActionController::class, 'markLost'])->name('leads.lost');
        Route::post('leads/{lead}/junk', [LeadStatusActionController::class, 'markJunk'])->name('leads.junk');
        Route::post('leads/{lead}/restore-status', [LeadStatusActionController::class, 'restore'])
            ->name('leads.restore-status')->withTrashed();

        // P06 — Clients + Contacts.
        Route::resource('clients', ClientController::class);

        // Contacts: shallow nested (contacts/{contact} without client prefix for update/destroy).
        Route::resource('clients.contacts', ContactController::class)
            ->shallow()
            ->only(['store', 'update', 'destroy']);

        // Contact: make primary action.
        Route::post('contacts/{contact}/primary', [ContactController::class, 'makePrimary'])
            ->name('contacts.primary');

        // Client groups (no show/create/edit views — list+store+update+destroy).
        Route::resource('client-groups', ClientGroupController::class)
            ->except(['show', 'create', 'edit']);

        // Customer-admin delegation.
        Route::post('clients/{client}/customer-admins', [ClientCustomerAdminController::class, 'sync'])
            ->name('clients.customer-admins.sync');

        // Vault entries (nested under clients).
        Route::post('clients/{client}/vault', [ClientVaultEntryController::class, 'store'])
            ->name('clients.vault.store');
        Route::put('clients/{client}/vault/{vaultEntry}', [ClientVaultEntryController::class, 'update'])
            ->name('clients.vault.update');
        Route::delete('clients/{client}/vault/{vaultEntry}', [ClientVaultEntryController::class, 'destroy'])
            ->name('clients.vault.destroy');

        // P08 — Projects + Milestones + Members + Files + Discussions.
        Route::prefix('projects')->name('projects.')->group(function () {
            Route::get('/', [ProjectController::class, 'index'])->name('index');
            Route::get('create', [ProjectController::class, 'create'])->name('create');
            Route::post('/', [ProjectController::class, 'store'])->name('store');
            Route::get('{project}', [ProjectController::class, 'show'])->name('show');
            Route::get('{project}/edit', [ProjectController::class, 'edit'])->name('edit');
            Route::patch('{project}', [ProjectController::class, 'update'])->name('update');
            Route::delete('{project}', [ProjectController::class, 'destroy'])->name('destroy');
            Route::patch('{project}/status', [ProjectController::class, 'changeStatus'])->name('status');
            Route::patch('{project}/pin', [ProjectController::class, 'togglePin'])->name('pin');
            Route::patch('{project}/progress/recalc', [ProjectController::class, 'recalcProgress'])->name('progress.recalc');

            // Members
            Route::post('{project}/members', [ProjectMemberController::class, 'store'])->name('members.store');
            Route::delete('{project}/members/{userId}', [ProjectMemberController::class, 'destroy'])->name('members.destroy');

            // Milestones
            Route::post('{project}/milestones', [ProjectMilestoneController::class, 'store'])->name('milestones.store');
            Route::patch('{project}/milestones/{milestone}', [ProjectMilestoneController::class, 'update'])->name('milestones.update');
            Route::post('{project}/milestones/reorder', [ProjectMilestoneController::class, 'reorder'])->name('milestones.reorder');
            Route::delete('{project}/milestones/{milestone}', [ProjectMilestoneController::class, 'destroy'])->name('milestones.destroy');

            // Files
            Route::post('{project}/files', [ProjectFileController::class, 'store'])->name('files.store');
            Route::delete('{project}/files/{attachment}', [ProjectFileController::class, 'destroy'])->name('files.destroy');

            // Discussions + replies
            Route::post('{project}/discussions', [ProjectDiscussionController::class, 'store'])->name('discussions.store');
            Route::delete('{project}/discussions/{discussion}', [ProjectDiscussionController::class, 'destroy'])->name('discussions.destroy');
            Route::post('{project}/discussions/{discussion}/replies', [ProjectDiscussionController::class, 'reply'])->name('discussions.reply');
        });

        // ===== Tasks =====
        // P09 — Tasks + Timers (class-first, no closures — A4). Nested under auth + workspace.
        Route::prefix('tasks')->name('tasks.')->group(function () {
            // Task CRUD
            Route::get('/', [TaskController::class, 'index'])->name('index');
            Route::get('/kanban', [TaskController::class, 'kanban'])->name('kanban');
            Route::post('/', [TaskController::class, 'store'])->name('store');
            Route::get('/{task}', [TaskController::class, 'show'])->name('show');
            Route::patch('/{task}', [TaskController::class, 'update'])->name('update');
            Route::delete('/{task}', [TaskController::class, 'destroy'])->name('destroy');

            // Status change
            Route::patch('/{task}/status', [TaskStatusController::class, 'update'])->name('status');

            // Kanban reorder
            Route::patch('/{task}/kanban-order', [TaskKanbanController::class, 'reorder'])->name('kanban-order');

            // Assignees
            Route::patch('/{task}/assignees', [TaskAssigneeController::class, 'update'])->name('assignees.update');

            // Checklist
            Route::post('/{task}/checklist', [TaskChecklistController::class, 'store'])->name('checklist.store');
            Route::patch('/{task}/checklist/{item}/toggle', [TaskChecklistController::class, 'toggle'])->name('checklist.toggle');
            Route::post('/{task}/checklist/reorder', [TaskChecklistController::class, 'reorder'])->name('checklist.reorder');
            Route::delete('/{task}/checklist/{item}', [TaskChecklistController::class, 'destroy'])->name('checklist.destroy');

            // Timers / Timesheets
            Route::post('/{task}/timers/start', [TaskTimerController::class, 'start'])->name('timers.start');
            Route::patch('/{task}/timers/{timer}/stop', [TaskTimerController::class, 'stop'])->name('timers.stop');
            Route::post('/{task}/timers/log', [TaskTimerController::class, 'logManual'])->name('timers.log');
            Route::patch('/{task}/timers/{timer}', [TaskTimerController::class, 'update'])->name('timers.update');
            Route::delete('/{task}/timers/{timer}', [TaskTimerController::class, 'destroy'])->name('timers.destroy');
        });

        // Integrations catalog page.
        Route::get('integrations', [IntegrationController::class, 'index'])->name('integrations.index');

        // Zalo personal connection CRUD (QR connect / list / promote / logout).
        // auth + workspace already applied by the enclosing group. Toggle via config/integrations.php.
        if (config('integrations.zalo_personal.enabled')) {
            Route::prefix('integrations')->name('integrations.zalo.')->group(function () {
                Route::controller(ZaloConnectionController::class)
                    ->prefix('zalo')
                    ->group(function () {
                        Route::get('/', 'index')->name('index');
                        Route::post('/', 'store')->name('store');
                        Route::get('/qr-status', 'qr')->name('qr');
                        Route::post('/promote', 'promote')->name('promote');
                        Route::delete('/{zaloConnection}', 'destroy')->name('destroy');
                    });
            });
        }

        // P07 — Inbox (channel-agnostic conversation list + send + conv→Lead).
        Route::get('/inbox', [InboxController::class, 'index'])->name('inbox.index');
        Route::post('/inbox/resync', [InboxController::class, 'resync'])->name('inbox.resync');
        Route::get('/inbox/conversations/{conversation}/messages', [InboxController::class, 'messages'])
            ->name('inbox.messages');
        // P05 — stream hợp nhất messages + gap marker (session_gap), keyset cursor.
        Route::get('/inbox/conversations/{conversation}/stream', ConversationStreamController::class)
            ->name('inbox.stream');
        Route::post('/inbox/conversations/{conversation}/messages', [InboxController::class, 'send'])
            ->name('inbox.send');
        Route::post('/inbox/conversations/{conversation}/lead', [ConversationLeadController::class, 'store'])
            ->name('inbox.lead.store');
        // P04 — composer media: upload multipart trước, send JSON {attachment_id} sau.
        Route::post('/inbox/conversations/{conversation}/attachments', [ConversationAttachmentController::class, 'store'])
            ->name('inbox.attachments.store');
        Route::get('/inbox/attachments/{attachmentKey}', [ConversationAttachmentController::class, 'show'])
            ->name('inbox.attachments.show');
        // P05 — nhập tay SĐT + verify qua kênh (manual_verified).
        Route::put('/inbox/conversations/{conversation}/phone', [ConversationPhoneController::class, 'update'])
            ->name('inbox.phone.update');
        // P06a — reaction (dispatcher caller đầu tiên) + sticker search.
        Route::post('/inbox/conversations/{conversation}/messages/{message}/reaction', [MessageInteractionController::class, 'react'])
            ->name('inbox.reaction');
        Route::get('/inbox/conversations/{conversation}/stickers', [MessageInteractionController::class, 'stickers'])
            ->name('inbox.stickers');
        // Deep-link tới 1 hội thoại — reload-safe + share được. Cùng controller index, preselect.
        Route::get('/inbox/{conversation}', [InboxController::class, 'index'])
            ->whereUuid('conversation')
            ->name('inbox.show');
    });
});

// Announcements — tenant-plane: What's New feed + mark-read.
Route::middleware(['auth', 'workspace'])->group(function () {
    Route::get('whats-new', WhatsNewController::class)->name('announcements.index');
    Route::post('whats-new/{announcement}/read', AnnouncementReadController::class)->name('announcements.read');
});

// ===== Settings =====
Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    // Language preference (design-system §10) — user menu + auth pages.
    Route::put('locale', LocaleController::class)->name('locale');

    Route::prefix('settings')->group(function () {
        Route::controller(ProfileController::class)->name('profile.')->group(function () {
            Route::get('profile', 'edit')->name('edit');
            Route::patch('profile', 'update')->name('update');
            Route::delete('profile', 'destroy')->name('destroy')->middleware('no.impersonation');
        });

        Route::controller(PasswordController::class)->name('password.')->group(function () {
            Route::get('password', 'edit')->name('edit');
            Route::put('password', 'update')->name('update')->middleware('no.impersonation');
        });

        Route::get('appearance', AppearanceController::class)->name('appearance');
    });
});

// Workspace-scoped settings require an active workspace context (IdentifyWorkspace).
Route::middleware(['auth', 'workspace'])->prefix('settings')->group(function () {
    Route::controller(WorkspaceController::class)->name('workspace.')->group(function () {
        Route::get('workspace', 'edit')->name('edit');
        Route::patch('workspace', 'update')->name('update');
    });

    Route::controller(TeamController::class)->prefix('teams')->name('teams.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('{team}', 'update')->name('update');
        Route::patch('{team}/reparent', 'reparent')->name('reparent');
        Route::delete('{team}', 'destroy')->name('destroy');
    });

    Route::controller(MemberController::class)->prefix('members')->name('members.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::patch('{member}', 'update')->name('update');
        Route::delete('{member}', 'destroy')->name('destroy');
    });

    // Lookups (P01): admin-only workspace reference data management.
    Route::prefix('lookups')->name('lookups.')->group(function () {
        // Pipelines
        Route::controller(PipelineController::class)->prefix('pipelines')->name('pipelines.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{pipeline}', 'update')->name('update');
            Route::delete('{pipeline}', 'destroy')->name('destroy');
        });

        // Pipeline stages (nested under pipeline)
        Route::prefix('pipelines/{pipeline}/stages')->name('stages.')->group(function () {
            Route::post('/', [PipelineStageController::class, 'store'])->name('store');
        });
        Route::prefix('stages')->name('stage.')->group(function () {
            Route::patch('{stage}', [PipelineStageController::class, 'update'])->name('update');
            Route::delete('{stage}', [PipelineStageController::class, 'destroy'])->name('destroy');
        });

        // Lead sources
        Route::controller(LeadSourceController::class)->prefix('lead-sources')->name('lead-sources.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{lead_source}', 'update')->name('update');
            Route::delete('{lead_source}', 'destroy')->name('destroy');
        });

        // Project statuses
        Route::controller(ProjectStatusController::class)->prefix('project-statuses')->name('project-statuses.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::patch('{project_status}', 'update')->name('update');
            Route::delete('{project_status}', 'destroy')->name('destroy');
        });
    });

    // Email templates (P06).
    Route::controller(EmailTemplateController::class)
        ->prefix('email-templates')
        ->name('email-templates.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('{template}', 'edit')->name('edit');
            Route::patch('{template}', 'update')->name('update');
            Route::post('{template}/test', 'test')->name('test');
        });

    // Custom fields (P02) — admin CRUD for field definitions per entity_type.
    Route::controller(CustomFieldController::class)->prefix('custom-fields')->name('custom-fields.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::put('{definition}', 'update')->name('update');
        Route::delete('{definition}', 'destroy')->name('destroy');
    });
});

// ===== Auth =====
Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});

// ===== Admin =====
// Admin-plane controllers are fully-qualified inline to avoid short-name collisions
// with the tenant-plane `use` imports above (AuthenticatedSessionController,
// NewPasswordController, PasswordResetLinkController, DashboardController, WorkspaceController).
Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('login', [App\Http\Controllers\Identity\Admin\Auth\AuthenticatedSessionController::class, 'create'])
            ->name('login');

        Route::post('login', [App\Http\Controllers\Identity\Admin\Auth\AuthenticatedSessionController::class, 'store']);

        Route::get('forgot-password', [App\Http\Controllers\Identity\Admin\Auth\PasswordResetLinkController::class, 'create'])
            ->name('password.request');

        Route::post('forgot-password', [App\Http\Controllers\Identity\Admin\Auth\PasswordResetLinkController::class, 'store'])
            ->name('password.email');

        Route::get('reset-password/{token}', [App\Http\Controllers\Identity\Admin\Auth\NewPasswordController::class, 'create'])
            ->name('password.reset');

        Route::post('reset-password', [App\Http\Controllers\Identity\Admin\Auth\NewPasswordController::class, 'store'])
            ->name('password.store');
    });

    Route::middleware(['auth:admin', 'admin.scope'])->group(function () {
        Route::redirect('/', '/admin/dashboard');

        Route::get('dashboard', App\Http\Controllers\Identity\Admin\DashboardController::class)->name('dashboard');

        Route::post('logout', [App\Http\Controllers\Identity\Admin\Auth\AuthenticatedSessionController::class, 'destroy'])
            ->name('logout');

        Route::middleware('admin.can:platform.workspaces.view')->group(function () {
            Route::get('workspaces', [App\Http\Controllers\Identity\Admin\WorkspaceController::class, 'index'])->name('workspaces.index');
            Route::get('workspaces/{workspace}', [App\Http\Controllers\Identity\Admin\WorkspaceController::class, 'show'])->name('workspaces.show');
        });

        Route::middleware('admin.can:platform.billing.manage')->group(function () {
            Route::get('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'index'])->name('workspaces.plans.index');
            Route::post('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'store'])->name('workspaces.plans.store');
            Route::delete('workspaces/{workspace}/plans', [WorkspacePlanController::class, 'destroy'])->name('workspaces.plans.destroy');
        });

        Route::post('workspaces/{workspace}/members/{user}/impersonate', [ImpersonationController::class, 'store'])
            ->middleware('admin.can:platform.impersonate')
            ->name('workspaces.impersonate');

        // Stop impersonation (the admin guard is still authenticated here).
        Route::post('impersonate/stop', [ImpersonationController::class, 'destroy'])
            ->name('impersonate.stop');

        // Announcements — admin CRUD + publish/unpublish.
        Route::middleware('admin.can:platform.announcements.manage')->group(function () {
            Route::resource('announcements', AnnouncementController::class)
                ->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

            Route::post('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'store'])
                ->name('announcements.publish');

            Route::delete('announcements/{announcement}/publish', [AnnouncementPublishController::class, 'destroy'])
                ->name('announcements.unpublish');
        });

    });
});

// P04 — bridge fetch media outbound: signed URL TTL ngắn (A3), KHÔNG session/auth.
// RLS bind thủ công trong controller từ param ws đã ký. Ngoài mọi group tenant.
Route::get('/inbox/attachments/{attachmentKey}/raw', [ConversationAttachmentController::class, 'raw'])
    ->middleware('signed')
    ->name('inbox.attachments.raw');
