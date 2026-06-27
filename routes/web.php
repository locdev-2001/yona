<?php

use App\Http\Controllers\DashboardController;
use Modules\CrmSales\Http\Controllers\Clients\ClientController;
use Modules\CrmSales\Http\Controllers\Clients\ClientCustomerAdminController;
use Modules\CrmSales\Http\Controllers\Clients\ClientGroupController;
use Modules\CrmSales\Http\Controllers\Clients\ClientVaultEntryController;
use Modules\CrmSales\Http\Controllers\Clients\ContactController;
use Modules\CrmSales\Http\Controllers\Leads\LeadController;
use Modules\CrmSales\Http\Controllers\Leads\LeadConversionController;
use Modules\CrmSales\Http\Controllers\Leads\LeadStageController;
use Modules\CrmSales\Http\Controllers\Leads\LeadStatusActionController;
use App\Http\Controllers\Projects\ProjectController;
use App\Http\Controllers\Projects\ProjectDiscussionController;
use App\Http\Controllers\Projects\ProjectFileController;
use App\Http\Controllers\Projects\ProjectMemberController;
use App\Http\Controllers\Projects\ProjectMilestoneController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;
use Modules\Shared\Http\Controllers\AttachmentController;
use Modules\Shared\Http\Controllers\CommentController;
use Modules\Shared\Http\Controllers\NoteController;
use Modules\Shared\Http\Controllers\NotificationController;
use Modules\Shared\Http\Controllers\ReminderController;
use Modules\Shared\Http\Controllers\TagController;
use Modules\Tenancy\Http\Controllers\WorkspaceSwitchController;

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
        Route::post('leads/{lead}/restore-status', [LeadStatusActionController::class, 'restore'])->name('leads.restore-status');

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

        // P09 — Tasks + Timers.
        require __DIR__.'/tasks.php';
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
