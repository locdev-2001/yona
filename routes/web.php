<?php

use App\Http\Controllers\AnnouncementReadController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Clients\ClientController;
use App\Http\Controllers\Clients\ClientCustomerAdminController;
use App\Http\Controllers\Clients\ClientGroupController;
use App\Http\Controllers\Clients\ClientVaultEntryController;
use App\Http\Controllers\Clients\ContactController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Leads\LeadConversionController;
use App\Http\Controllers\Leads\LeadStageController;
use App\Http\Controllers\Leads\LeadStatusActionController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\WhatsNewController;
use App\Http\Controllers\WorkspaceSwitchController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    // Switch active workspace (validated against the user's memberships).
    Route::post('workspaces/{workspace}/switch', WorkspaceSwitchController::class)->name('workspaces.switch');

    // Workspace-scoped app screens require an active membership (IdentifyWorkspace).
    Route::middleware('workspace')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        // Announcements / What's New — tenant feed + mark-read.
        Route::get('whats-new', WhatsNewController::class)->name('announcements.index');
        Route::post('whats-new/{announcement}/read', AnnouncementReadController::class)->name('announcements.read');

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
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
